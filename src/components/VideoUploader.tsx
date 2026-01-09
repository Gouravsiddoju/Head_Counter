import { useCallback, useState } from "react";
import { Upload, Video, X, FileVideo } from "lucide-react";

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
          className="absolute top-3 right-3 z-10 p-2 bg-card border border-border rounded hover:bg-destructive/10 hover:border-destructive/30 transition-colors group"
        >
          <X className="w-4 h-4 text-muted-foreground group-hover:text-destructive" />
        </button>
        <video
          src={videoUrl}
          controls
          className="w-full h-full object-contain rounded bg-secondary/50"
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
        relative w-full h-full min-h-[400px] rounded border-2 border-dashed 
        transition-all duration-200 flex flex-col items-center justify-center gap-5
        ${isDragging 
          ? "border-primary bg-primary/5" 
          : "border-border hover:border-primary/50 bg-secondary/30"
        }
      `}
    >
      <div className={`
        p-5 rounded-full transition-colors
        ${isDragging ? "bg-primary/10" : "bg-secondary"}
      `}>
        {isDragging ? (
          <Video className="w-10 h-10 text-primary" />
        ) : (
          <FileVideo className="w-10 h-10 text-muted-foreground" />
        )}
      </div>
      
      <div className="text-center space-y-1">
        <p className="text-base font-semibold text-foreground">
          {isDragging ? "Release to upload" : "Upload Video File"}
        </p>
        <p className="text-sm text-muted-foreground">
          Drag and drop or click to browse
        </p>
      </div>

      <label className="px-5 py-2.5 rounded bg-primary text-primary-foreground text-sm font-semibold cursor-pointer hover:bg-primary/90 transition-colors">
        <span className="flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Select File
        </span>
        <input
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </label>

      <p className="text-xs text-muted-foreground">
        Supported formats: MP4, WebM, MOV
      </p>
    </div>
  );
};

export default VideoUploader;
