
"""
Multi-Camera System for Railway Station Crowd Counting
Processes multiple videos and identifies unique people across all streams.
"""

import cv2
import torch
import numpy as np
from ultralytics import YOLO
import yaml
import argparse
import time
import sys
import glob
import os
from pathlib import Path

# Import existing modules
from preprocessing import FramePreprocessor
from stream_handler import StreamHandler
from advanced_tracker import TrackManager
from cross_cam_reid import CrossCameraMatcher
from cross_cam_reid import CrossCameraMatcher
from analytics import AnalyticsEngine
from results_manager import ResultManager
from visualization_utils import generate_depth_map, DepthMapAnimator

class SingleVideoProcessor:
    """Processes a single video to extract tracks"""
    
    def __init__(self, config: dict, model: YOLO, device: str, result_manager: ResultManager = None):
        self.config = config
        self.model = model
        self.device = device
        self.result_manager = result_manager
        
        # Initialize components
        self.track_manager = TrackManager(config['tracking'])
        self.preprocessor = FramePreprocessor(config['preprocessing'])
        self.preprocessor = FramePreprocessor(config['preprocessing'])
        
        # Setup analytics with result folder path if available
        if self.result_manager:
            # Create a unique log name per video (or shared if preferred, but per video is safer for multicam unless aggregated)
            # Actually analytics is instantiated per video processor here.
            # Let's save as {video_name}_analytics.csv in results folder
            import os
            self.config['analytics']['log_file_path'] = self.result_manager.get_path(f'analytics_{int(time.time())}.csv')
            
        self.analytics = AnalyticsEngine(config['analytics']) # Initialize per-video analytics
        
        self.frame_count = 0
        
        self.boundaries = self.config.get('boundaries', {})
        self.boundary_polygon = None
        self.boundary_type = 'inclusion'
        self.exclusion_polygons = []
        self.effective_area = 0.0
        
    def _init_boundary(self, video_name: str):
        """Initialize boundary for specific video"""
        if not self.boundaries.get('enabled', False):
            return

        cameras_config = self.boundaries.get('cameras', {})
        if video_name in cameras_config:
            cam_config = cameras_config[video_name]
            points = cam_config.get('polygon', [])
            if points:
                self.boundary_polygon = np.array(points, dtype=np.int32)
                self.boundary_type = cam_config.get('type', 'inclusion')
                self.exclusion_polygons = [np.array(p, dtype=np.int32) for p in cam_config.get('exclusions', [])]
                print(f"  Initialized {self.boundary_type} boundary with {len(points)} points")
                if self.exclusion_polygons:
                    print(f"  Initialized {len(self.exclusion_polygons)} exclusion zones")
                
                if self.result_manager:
                    # Static Map
                    viz_filename = f"depth_map_{video_name}.png"
                    viz_path = self.result_manager.get_path(viz_filename)
                    generate_depth_map(self.boundaries['cameras'][video_name], viz_path)
                    
                    # Animated Map
                    anim_filename = f"depth_map_video_{video_name}.mp4"
                    anim_path = self.result_manager.get_path(anim_filename)
                    self.depth_animator = DepthMapAnimator(self.boundaries['cameras'][video_name], anim_path)
                else:
                    self.depth_animator = None
        else:
            self.depth_animator = None
            
        # Calculate effective area if possible
        if self.boundary_polygon is not None and self.boundaries.get('cameras', {}).get(video_name, {}).get('area_sq_meters'):
             total_area_m2 = self.boundaries['cameras'][video_name]['area_sq_meters']
             
             # Calculate pixel areas to find exclusion ratio
             incl_pixel_area = cv2.contourArea(self.boundary_polygon)
             excl_pixel_area = 0
             if self.exclusion_polygons:
                 for p in self.exclusion_polygons:
                     excl_pixel_area += cv2.contourArea(p)
            
             if incl_pixel_area > 0:
                 ratio = max(0.0, (incl_pixel_area - excl_pixel_area) / incl_pixel_area)
                 self.effective_area = total_area_m2 * ratio
                 print(f"  Area: {total_area_m2}m² (Config) -> {self.effective_area:.2f}m² (Effective after exclusions)")
             else:
                 self.effective_area = total_area_m2

        
    def _calculate_capacity(self, calib, polygon, shape):
        """Calculate zone capacity using perspective integration with exclusions"""
        try:
            h, w = shape
            mask = np.zeros((h, w), dtype=np.uint8)
            cv2.fillPoly(mask, [polygon], 1)
            
            # Apply exclusions - set pixels to 0
            if hasattr(self, 'exclusion_polygons') and self.exclusion_polygons:
                cv2.fillPoly(mask, self.exclusion_polygons, 0)
            
            # Get Y coordinates of all pixels in valid area
            ys, xs = np.where(mask > 0)
            if len(ys) == 0:
                return 0

            fy, fa = calib['front_y'], calib['front_area']
            by, ba = calib['back_y'], calib['back_area']
            
            # Avoid division by zero
            if fy == by:
                return 0
                
            # Normalize Y (0 at back, 1 at front)
            # Clip to valid range to avoid extreme extrapolation
            y_norm = (ys - by) / (fy - by)
            y_norm = np.clip(y_norm, -0.5, 1.5) 
            
            # Interpolate area
            pixel_areas = ba + (fa - ba) * y_norm
            pixel_areas = np.maximum(pixel_areas, 10.0) # Min 10 pixels
            
            # Buffer factor (Personal space + Packing inefficiency)
            # OLD: 2.0 = Person needs 2x their actual bounding box area. WRONG.
            # Bounding box is full height (Area = W * H). 
            # Standing footprint is roughly W * W or W * Depth ~ Area / 3 to Area / 4.
            # So the divisor should be much smaller.
            # Let's say Footprint = 0.3 * BBox Area.
            footprint_factor = 0.4
            effective_areas = pixel_areas * footprint_factor
            
            # Sum capacity contributions
            total_capacity = np.sum(1.0 / effective_areas)
            
            return int(total_capacity)
        except Exception as e:
            print(f"Error calculating capacity: {e}")
            return 0
        
    def process_video(self, video_path: str, frame_limit: int = 0):
        """Run processing on a video file"""
        video_name = os.path.basename(video_path)
        print(f"\nPROCESSING: {video_name}")
        
        # Initialize component
        self._init_boundary(video_name)
        
        # Initialize stream for this video
        stream_config = {'type': 'file', 'file_path': video_path}
        stream = StreamHandler(stream_config)
        
        if not stream.is_connected():
            print(f"Error: Could not open {video_path}")
            return []
            
        props = stream.get_properties()
        fps = props['fps']
        total_frames = props.get('total_frames', 0)
        
        print(f"  Resolution: {props['width']}x{props['height']}, FPS: {fps}, Frames: {total_frames}")
        
        # Scale boundary if needed (assuming config is for 1920x1080 or model size, but here we use pixel values directly)
        # Advanced: resize polygon if video resolution differs from config expectation
        
        
        frame_skip = self.config['performance'].get('frame_skip', 1)
        
         # Init capacity
        self.capacity = 0
        cam_config = {}
        if self.boundaries.get('enabled', False) and video_name in self.boundaries.get('cameras', {}):
             cam_config = self.boundaries['cameras'][video_name]
             
             # Physical Capacity Calculation
             if self.effective_area > 0:
                 phys_params = self.config.get('physical_params', {})
                 base_footprint = phys_params.get('base_footprint_m2', 0.4)
                 # Average buffer for static capacity (between 1.2 and 2.0 -> 1.6)
                 buffer_avg = (phys_params.get('buffer_factor_high', 2.0) + phys_params.get('buffer_factor_low', 1.2)) / 2.0
                 
                 self.capacity = int(self.effective_area / (base_footprint * buffer_avg))
                 print(f"  Physical Capacity: {self.capacity} people (Effective Area: {self.effective_area:.1f}m²)")
                 
             elif 'calibration' in cam_config:
                 self.capacity = self._calculate_capacity(cam_config['calibration'], self.boundary_polygon, (props['height'], props['width']))
                 print(f"  Perspective Capacity: {self.capacity} people")
             elif 'area_sq_meters' in cam_config:
                 # Fallback: Fixed density capacity (2.5 people / m^2)
                 area = cam_config['area_sq_meters']
                 self.capacity = int(area * 2.5) 
                 print(f"  Fixed Capacity (from Area): {self.capacity} people (Area: {area}m²)")
        
        # Initialize Video Writer
        self.video_writer = None
        self.output_path = ""
        # FORCE SAVE VIDEO = TRUE
        self.config['output']['save_video'] = True
        
        if self.config['output'].get('save_video', False):
            self.output_path = f"output_{video_name}"
            # Ensure mp4 extension
            if not self.output_path.lower().endswith('.mp4'):
                self.output_path = os.path.splitext(self.output_path)[0] + '.mp4'
            
            # Redirect to results folder
            if self.result_manager:
                self.output_path = self.result_manager.get_path(self.output_path)
            # Ensure mp4 extension
            if not self.output_path.lower().endswith('.mp4'):
                self.output_path = os.path.splitext(self.output_path)[0] + '.mp4'
                
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            self.video_writer = cv2.VideoWriter(self.output_path, fourcc, fps, (props['width'], props['height']))
            print(f"  Recording output to: {self.output_path}")
        
        try:
            while True:
                frame_start_time = time.time()
                ret, frame = stream.read()
                
                if not ret:
                    break
                
                # Check limit
                if frame_limit > 0 and self.frame_count >= frame_limit:
                    print(f"  Reached limit of {frame_limit} frames.")
                    break
                    
                self.frame_count += 1
                
                if self.frame_count % 30 == 0:
                    if total_frames > 0:
                        percent = int(self.frame_count / total_frames * 100)
                        sys.stdout.write(f"\r  Progress: {self.frame_count}/{total_frames} frames ({percent}%)")
                    else:
                        sys.stdout.write(f"\r  Progress: {self.frame_count} frames")
                    sys.stdout.flush()
                
                # Skip frames for speed
                if frame_skip > 1 and self.frame_count % frame_skip != 0:
                    continue
                
                # 1. Preprocess
                processed_frame = self.preprocessor.process(frame)
                
                # 2. Detect & Track
                results = self.model.track(
                    processed_frame,
                    persist=True,
                    device=self.device,
                    verbose=False,
                    tracker=self.config['tracking']['tracker'],
                    imgsz=self.config['model']['imgsz'],
                    conf=self.config['model']['conf_threshold']
                )
                
                # 3. Update Tracking
                yolo_tracks = {}
                # DEBUG: Check model classes once
                if self.frame_count == 1:
                    print(f"DEBUG: Model Classes: {results[0].names}")

                for r in results:
                    boxes = r.boxes
                    if self.frame_count % 30 == 0:
                         print(f"DEBUG Frame {self.frame_count}: Raw Boxes: {len(boxes)}")
                         
                    for box in boxes:
                        if int(box.cls[0]) == 0:  # Person/Face
                            x1, y1, x2, y2 = map(int, box.xyxy[0])
                            conf = float(box.conf[0])
                            
                            # Use frame.shape for clamping logic
                            valid, reason = self._is_valid_detection(x1, y1, x2, y2, frame.shape[:2])
                            if valid:
                                if box.id is not None:
                                    track_id = int(box.id[0])
                                    yolo_tracks[track_id] = ((x1, y1, x2, y2), conf)
                            elif self.frame_count % 30 == 0:
                                # Print rejection reason occasionally
                                print(f"DEBUG Frame {self.frame_count}: Rejected {reason}")
                
                
                # Calculate pixel metrics
                polygon_pixels = 0
                if self.boundary_polygon is not None and self.boundary_type == 'inclusion':
                    polygon_pixels = cv2.contourArea(self.boundary_polygon)
                elif frame is not None:
                    # If no boundary or exclusion, use full frame area
                    polygon_pixels = frame.shape[0] * frame.shape[1]

                occupied_pixels = 0
                for track in self.track_manager.active_tracks.values():
                    w = track.bbox[2] - track.bbox[0]
                    h = track.bbox[3] - track.bbox[1]
                    occupied_pixels += (w * h)
                
                # End timing
                frame_end_time = time.time()
                process_time = frame_end_time - frame_start_time
                
                # Prepare metrics
                # Filter for newly completed tracks (ended at current frame)
                newly_completed = [t.duration_seconds(fps) for t in self.track_manager.completed_tracks 
                                  if t.last_seen == self.frame_count]

                metrics = {
                    'current_count': len(self.track_manager.active_tracks),
                    'unique_count': len(self.track_manager.unique_ids),
                    'frame_time': process_time, 
                    'polygon_pixels': polygon_pixels,
                    'occupied_pixels': occupied_pixels,
                    'occupied_pixels': occupied_pixels,
                    'capacity': self.capacity,
                    'area_sq_meters': self.effective_area,
                    'completed_dwell_times': newly_completed
                }
                
                self.analytics.update(metrics)
                
                self.track_manager.update([], frame, self.frame_count, yolo_tracks)
                
                # Update Depth Map Animation
                # Use active tracks
                if self.depth_animator:
                    self.depth_animator.update(self.track_manager.active_tracks.values())
                
                if self.config['output'].get('save_video', False):
                    # Draw Boundary
                    if self.boundary_polygon is not None:
                        color = (0, 0, 255) if self.boundary_type == 'exclusion' else (0, 255, 0)
                        cv2.polylines(frame, [self.boundary_polygon], True, color, 2)
                        
                    # Draw Exclusions
                    if self.exclusion_polygons:
                        cv2.polylines(frame, self.exclusion_polygons, True, (0, 0, 255), 2)
                    
                    # Draw Tracks
                    for track_id, track in self.track_manager.active_tracks.items():
                        x1, y1, x2, y2 = track.bbox
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                        cv2.putText(frame, f"ID:{track_id}", (x1, y1-10),
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                    
                    # Write frame
                    if self.video_writer:
                        self.video_writer.write(frame)
                
        except KeyboardInterrupt:
            print("  Interrupted!")
        finally:
            stream.release()
            if hasattr(self, 'video_writer') and self.video_writer:
                self.video_writer.release()
                print(f"  Video saved to {self.output_path}")
            
            if hasattr(self, 'depth_animator') and self.depth_animator:
                self.depth_animator.release()
            
            if hasattr(self, 'analytics'):
                self.analytics.close()
            
        # Collect ALL tracks
        all_tracks = []
        all_tracks.extend(self.track_manager.active_tracks.values())
        all_tracks.extend(self.track_manager.lost_tracks)
        all_tracks.extend(self.track_manager.completed_tracks)
        
        # Remove duplicates (in case a track is in both lost/completed lists somehow)
        unique_tracks = {}
        for t in all_tracks:
            unique_tracks[t.track_id] = t
            
        final_list = list(unique_tracks.values())
        print(f"  Finished {video_name}: Found {len(final_list)} unique local tracks.")
        
        return final_list

    def _is_valid_detection(self, x1, y1, x2, y2, frame_shape_hw=None):
        """Check if detection is valid (size and boundary). Returns (bool, reason)"""
        width = x2 - x1
        height = y2 - y1
        
        # 1. Size filter
        if height <= 10 or width <= 10:
            return False, "Size"
            
        # 2. Boundary filter
        if self.boundary_polygon is not None:
            # Check center bottom point (feet location usually best for boundary)
            # or center point
            
            # HEAD DETECTION ADAPTATION:
            # Current box is HEAD. Feet are much lower.
            # Avg head height ~ 22-25cm. Avg height            # HEAD DETECTION ADAPTATION:
            # Projection: y_feet = y_head_bottom + (head_height * 6.5)
            # ONLY apply if using a Head/Face model
            
            model_name = self.config['model']['name']
            is_head_model = 'head' in model_name or 'face' in model_name
            
            feet_offset = 0
            if is_head_model:
                head_h = y2 - y1
                feet_offset = int(head_h * 6.5)
            
            cx = int((x1 + x2) / 2)
            cy = int(y2 + feet_offset) # Projected Feet
            
            # Clamp to screen bottom if provided
            if frame_shape_hw:
                h, w = frame_shape_hw
                cy = min(cy, h - 1)
            
            is_inside = cv2.pointPolygonTest(self.boundary_polygon, (cx, cy), False) >= 0
            
            if self.boundary_type == 'inclusion':
                if not is_inside:
                    return False, f"Boundary (Excl: {cx},{cy})"
            else: # exclusion
                if is_inside:
                    return False, f"Boundary (Incl: {cx},{cy})"
                    
        # Check Exclusion Polygons
        if self.exclusion_polygons:
            for poly in self.exclusion_polygons:
                if cv2.pointPolygonTest(poly, (cx, cy), False) >= 0:
                     return False, f"ExclusionPoly"
                     
        return True, "Valid"

def main():
    # ==========================================
    # INPUT CONFIGURATION
    # Paste your video file path or folder path here:
    INPUT_SOURCE = "OneDrive/videos/NR_NDLS_SERVER_2_NR_NDLS_PF16_CPSIDE_PTZ_104_20260102183911000_20260102184011000_High.wmv" 
    # Examples:
    # INPUT_SOURCE = "clip"                   # Process all videos in 'clip' folder
    # INPUT_SOURCE = "/path/to/my/video.mp4"  # Process specific video
    # ==========================================

    parser = argparse.ArgumentParser(description='Multi-Camera Counting System')
    parser.add_argument('--folder', type=str, default='clip', help='Folder containing videos')
    parser.add_argument('--video', type=str, help='Specific video file to process')
    parser.add_argument('--config', type=str, default='config.yaml', help='Config file')
    parser.add_argument('--limit', type=int, default=0, help='Max frames to process per video (0 = all)')
    parser.add_argument('--save', action='store_true', help='Save annotated video output')
    args = parser.parse_args()
    
    # Load config
    with open(args.config) as f:
        config = yaml.safe_load(f)
        
    if args.save:
        config['output']['save_video'] = True
    else:
        # Force default True as requested
        config['output']['save_video'] = True
    
    # Initialize Result Manager
    result_manager = ResultManager() # Creates results/YYYY-... folder
    result_manager.save_config(args.config) # Save config for reference
        
    # Setup Model
    device_conf = config['model'].get('device', 'cpu')
    
    # Handle int device (0) from yaml which might be parsed as int
    if device_conf == 0 or str(device_conf) == '0':
        device = 'cuda:0'
    elif device_conf == 'cuda':
        device = 'cuda:0'
    else:
        device = 'cpu'
        
    if 'cuda' in device and not torch.cuda.is_available():
        print("Warning: CUDA not available, using CPU")
        device = 'cpu'
        
    # Explicitly force device selection
    if device != 'cpu':
        torch.cuda.set_device(0)
        
    print(f"Loading Model: {config['model']['name']} on {device}")
    model = YOLO(config['model']['name'])
    
    # Get Videos
    video_paths = []
    
    # Priority: Command Line > INPUT_SOURCE variable
    # If command line args are default/empty, use INPUT_SOURCE
    
    source_to_use = INPUT_SOURCE
    
    # Basic check if user provided args (override INPUT_SOURCE if they did)
    if args.video:
        source_to_use = args.video
    elif args.folder != 'clip': # If user changed folder arg
        source_to_use = args.folder
        
    print(f"Using Input Source: {source_to_use}")

    if os.path.isfile(source_to_use):
        video_paths = [source_to_use]
    elif os.path.isdir(source_to_use):
        video_extensions = ['*.mp4', '*.avi', '*.mov', '*.mkv', '*.wmv']
        for ext in video_extensions:
            video_paths.extend(glob.glob(os.path.join(source_to_use, ext)))
    else:
        print(f"Error: Input source '{source_to_use}' not found!")
        sys.exit(1)
    
    if not video_paths:
        print(f"No videos found in {source_to_use}!")
        sys.exit(1)
        
    video_paths.sort()
    print(f"Found {len(video_paths)} videos: {[os.path.basename(v) for v in video_paths]}")
    
    # Initialize Cross-Camera Matcher
    reid_matcher = CrossCameraMatcher(match_threshold=0.75)
    
    # Process each video
    total_local_counts = {}
    
    for video_path in video_paths:
        processor = SingleVideoProcessor(config, model, device, result_manager)
        tracks = processor.process_video(video_path, args.limit)
        
        video_name = os.path.basename(video_path)
        total_local_counts[video_name] = len(tracks)
        
        # Add to global matcher
        reid_matcher.add_video_tracks(video_name, tracks)
        
    # Perform Global Matching
    print("\n" + "="*60)
    print("GLOBAL ANALYSIS")
    print("="*60)
    
    total_unique, global_map = reid_matcher.match_tracks()
    
    print(f"\nFINAL REPORT:")
    print(f"  Total Videos Processed: {len(video_paths)}")
    print(f"  Total Unique Humans Across All Cameras: {total_unique}")
    print("-" * 40)
    print("  Breakdown by Camera (Local Counts):")
    for vid, count in total_local_counts.items():
        print(f"    - {vid}: {count} people")
    print("-" * 40)
    
    print("\nDone.")

if __name__ == "__main__":
    main()
