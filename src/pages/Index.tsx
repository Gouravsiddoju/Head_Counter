import { useState, useEffect, useCallback } from "react";
import { Users, UserCheck } from "lucide-react";
import VideoUploader from "@/components/VideoUploader";
import StatCard from "@/components/StatCard";
import CapacityMeter from "@/components/CapacityMeter";
import DashboardHeader from "@/components/DashboardHeader";

const MAX_ROOM_CAPACITY = 50;

const Index = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [peopleInFrame, setPeopleInFrame] = useState(0);
  const [totalPeopleSeen, setTotalPeopleSeen] = useState(0);
  const [animateStats, setAnimateStats] = useState(false);

  const handleVideoSelect = useCallback((file: File, url: string) => {
    setVideoFile(file);
    setVideoUrl(url);
    // Reset stats when new video is loaded
    setPeopleInFrame(0);
    setTotalPeopleSeen(0);
  }, []);

  const handleClearVideo = useCallback(() => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoFile(null);
    setVideoUrl(null);
    setPeopleInFrame(0);
    setTotalPeopleSeen(0);
  }, [videoUrl]);

  // Simulate head count changes for demo purposes
  // In production, this would be connected to your ML model
  useEffect(() => {
    if (!videoUrl) return;

    const interval = setInterval(() => {
      const randomChange = Math.floor(Math.random() * 5) - 2; // -2 to +2
      
      setPeopleInFrame(prev => {
        const newValue = Math.max(0, Math.min(prev + randomChange, MAX_ROOM_CAPACITY));
        
        if (newValue > prev) {
          setTotalPeopleSeen(total => total + (newValue - prev));
          setAnimateStats(true);
          setTimeout(() => setAnimateStats(false), 300);
        }
        
        return newValue;
      });
    }, 1500);

    // Initial detection simulation
    setTimeout(() => {
      const initialCount = Math.floor(Math.random() * 10) + 5;
      setPeopleInFrame(initialCount);
      setTotalPeopleSeen(initialCount);
      setAnimateStats(true);
      setTimeout(() => setAnimateStats(false), 300);
    }, 1000);

    return () => clearInterval(interval);
  }, [videoUrl]);

  const capacityPercentage = (peopleInFrame / MAX_ROOM_CAPACITY) * 100;

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <DashboardHeader isActive={!!videoUrl} />

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Video Panel - 60% */}
          <div className="lg:w-[60%] space-y-4">
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Video Feed
                </h2>
                {videoFile && (
                  <span className="text-sm text-muted-foreground">
                    {videoFile.name}
                  </span>
                )}
              </div>
              <div className="aspect-video">
                <VideoUploader
                  onVideoSelect={handleVideoSelect}
                  videoUrl={videoUrl}
                  onClear={handleClearVideo}
                />
              </div>
            </div>
          </div>

          {/* Stats Panel - 40% */}
          <div className="lg:w-[40%] space-y-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                Live Analytics
              </h2>
              
              <StatCard
                label="People in Frame"
                value={peopleInFrame}
                icon={<Users className="w-5 h-5" />}
                animate={animateStats}
              />

              <StatCard
                label="Total People Seen"
                value={totalPeopleSeen}
                icon={<UserCheck className="w-5 h-5" />}
                animate={animateStats}
              />

              <CapacityMeter
                percentage={capacityPercentage}
                currentCount={peopleInFrame}
                maxCapacity={MAX_ROOM_CAPACITY}
              />
            </div>

            {/* Info Card */}
            <div className="glass-card p-5 space-y-3">
              <h3 className="text-sm font-medium text-foreground">
                How it works
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  Upload a video with people for head count detection
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  View real-time count of people currently in frame
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  Track total unique people detected throughout the video
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  Monitor room capacity with visual indicators
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
