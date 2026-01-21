from ultralytics import YOLO
import os
import torch

# ==============================================================================
# CONFIGURATION
# ==============================================================================
PROJECT_DIR = os.getcwd() # Use current working directory
DATASET_DIR = os.path.join(PROJECT_DIR, 'datasets', 'crowdhuman_yolo')
DATA_YAML = os.path.join(DATASET_DIR, 'data.yaml')

# XLARGE P2 CONFIG (YOLOv8x-P2)
# Max accuracy config
P2_XLARGE_YAML_CONTENT = """
# Ultralytics YOLOv8-P2-XLarge 🚀, AGPL-3.0 license
# P2-head architecture for tiny object detection
# Parameters
nc: 2  # number of classes
scales: # model compound scaling constants, i.e. 'n', 's', 'm', 'l', 'x'
  x: [1.00, 1.25, 512] # YOLOv8x scaling factors

backbone:
  # [from, repeats, module, args]
  - [-1, 1, Conv, [64, 3, 2]]  # 0-P1/2
  - [-1, 1, Conv, [128, 3, 2]]  # 1-P2/4
  - [-1, 3, C2f, [128, true]]
  - [-1, 1, Conv, [256, 3, 2]]  # 3-P3/8
  - [-1, 6, C2f, [256, true]]
  - [-1, 1, Conv, [512, 3, 2]]  # 5-P4/16
  - [-1, 6, C2f, [512, true]]
  - [-1, 1, Conv, [1024, 3, 2]]  # 7-P5/32
  - [-1, 3, C2f, [1024, true]]
  - [-1, 1, SPPF, [1024, 5]]  # 9

head:
  - [-1, 1, nn.Upsample, [None, 2, 'nearest']]
  - [[-1, 6], 1, Concat, [1]]  # cat backbone P4
  - [-1, 3, C2f, [512]]  # 12

  - [-1, 1, nn.Upsample, [None, 2, 'nearest']]
  - [[-1, 4], 1, Concat, [1]]  # cat backbone P3
  - [-1, 3, C2f, [256]]  # 15 (P3/8-small)

  - [-1, 1, nn.Upsample, [None, 2, 'nearest']]
  - [[-1, 2], 1, Concat, [1]]  # cat backbone P2
  - [-1, 3, C2f, [128]]  # 18 (P2/4-xsmall)

  - [[18, 15, 12, 9], 1, Detect, [nc]]  # Detect(P2, P3, P4, P5)
"""

def create_model_config():
    """Creates the yolov8x-p2.yaml config file"""
    config_path = os.path.join(PROJECT_DIR, 'yolov8x-p2.yaml')
    # Always write to ensure latest config
    print(f"Creating P2-XLarge Architecture Config: {config_path}")
    with open(config_path, 'w', encoding='utf-8') as f:
        f.write(P2_XLARGE_YAML_CONTENT)
    return config_path

def train():
    print(f"Checking dataset at: {DATA_YAML}")
    if not os.path.exists(DATA_YAML):
        print("\n❌ ERROR: Dataset config not found!")
        print("Please run 'python prepare_crowdhuman.py' first or ensure datasets folder is correct.")
        return

    # Check GPU
    if torch.cuda.is_available():
        vram = torch.cuda.get_device_properties(0).total_memory / 1024**3
        print(f"🚀 GPU Detected: {torch.cuda.get_device_name(0)} ({vram:.1f} GB VRAM)")
        if vram > 22: # RTX 3090 / 4090
            batch_size = 32
        elif vram > 10: # RTX 3060/3080/4070
            batch_size = 16 
        else: # < 10GB
            batch_size = 8
    else:
        print("⚠️ No GPU detected! Training will be extremely slow.")
        batch_size = 2

    # 1. Create Model Config
    model_cfg = create_model_config()
    
    # 2. Initialize Model
    # Load COCO weights to backbone (yolov8x.pt), then apply P2 config
    # This transfers learned features from the standard x-large model
    print("Loading YOLOv8x weights...")
    try:
        model = YOLO(model_cfg).load('yolov8x.pt')
    except Exception as e:
        print(f"Note: Auto-download of weights might have failed or using local cache. Error: {e}")
        model = YOLO(model_cfg) # Fallback to random init if load fails

    print(f"\nSTARTING TRAINING (YOLOv8x-P2)")
    print(f"  - Resolution: 1280 (High Res)")
    print(f"  - Batch Size: {batch_size}")
    print(f"  - Epochs: 150")
    print(f"  - Augmentations: Scale, Mosaic, Mixup, Rotation")
    
    # 3. Train
    model.train(
        data=DATA_YAML,
        epochs=150,
        imgsz=1280,     # INCREASED from 960 -> 1280 for better small object detection
        batch=batch_size,
        workers=8,      # Standard workers
        patience=15,
        device=0 if torch.cuda.is_available() else 'cpu',
        project='runs/train',
        name='yolov8x-p2-highres',
        exist_ok=True,
        
        # Optimizer
        optimizer='auto', # usually AdamW
        cos_lr=True,      # Cosine LR scheduler
        
        # Critical Augmentations for Crowd Counting
        mosaic=1.0,       # Strong context augmentation
        mixup=0.15,       # Slight mixup for occlusion handling
        scale=0.5,        # 0.5 means (0.5x to 1.5x) scaling - helps with head sizes
        degrees=10.0,     # +/- 10 degrees rotation
        fliplr=0.5,       # Horizontal flip
        
        # Loss Gains (Optional tweaking)
        box=7.5,          # Boost box loss slightly
    )
    
    print("\n✅ Training Complete!")
    print(f"Best weights: runs/train/yolov8x-p2-highres/weights/best.pt")

if __name__ == '__main__':
    train()
