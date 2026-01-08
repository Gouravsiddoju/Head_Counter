import { useCallback, useState } from "react";
import { Upload, Video, X } from "lucide-react";

interface VideoUploaderProps {
  onVideoSelect: (file: File, url: string) => void;
  videoUrl: string | null;
  onClear: () => void;
}

const VideoUploader = ({ onVideoSelect, videoUrl, onClear }: VideoUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      onVideoSelect(file, url);
    }
  }, [onVideoSelect]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onVideoSelect(file, url);
    }
  }, [onVideoSelect]);

  if (videoUrl) {
    return (
      <div className="relative w-full h-full">
        <button
          onClick={onClear}
          className="absolute top-4 right-4 z-10 p-2 glass-card hover:bg-destructive/20 transition-colors group"
        >
          <X className="w-5 h-5 text-muted-foreground group-hover:text-destructive" />
        </button>
        <video
          src={videoUrl}
          controls
          className="w-full h-full object-contain rounded-xl bg-secondary/30"
          autoPlay
          loop
        />
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative w-full h-full min-h-[400px] rounded-xl border-2 border-dashed 
        transition-all duration-300 flex flex-col items-center justify-center gap-6
        ${isDragging 
          ? "border-primary bg-primary/10 scale-[1.02]" 
          : "border-border hover:border-primary/50 bg-secondary/20"
        }
      `}
    >
      <div className={`
        p-6 rounded-full transition-all duration-300
        ${isDragging ? "bg-primary/20" : "bg-secondary"}
      `}>
        {isDragging ? (
          <Video className="w-12 h-12 text-primary animate-pulse" />
        ) : (
          <Upload className="w-12 h-12 text-muted-foreground" />
        )}
      </div>
      
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-foreground">
          {isDragging ? "Drop your video here" : "Drag & drop a video"}
        </p>
        <p className="text-sm text-muted-foreground">
          or click to browse
        </p>
      </div>

      <label className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium cursor-pointer hover:bg-primary/90 transition-colors">
        Select Video
        <input
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </label>

      <p className="text-xs text-muted-foreground">
        Supports MP4, WebM, MOV
      </p>
    </div>
  );
};

export default VideoUploader;
