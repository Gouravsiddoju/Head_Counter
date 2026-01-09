import { useState, useEffect, useCallback } from "react";
import { Users, UserCheck, Info } from "lucide-react";
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
  useEffect(() => {
    if (!videoUrl) return;

    const interval = setInterval(() => {
      const randomChange = Math.floor(Math.random() * 5) - 2;
      
      setPeopleInFrame(prev => {
        const newValue = Math.max(0, Math.min(prev + randomChange, MAX_ROOM_CAPACITY));
        
        if (newValue > prev) {
          setTotalPeopleSeen(total => total + (newValue - prev));
          setAnimateStats(true);
          setTimeout(() => setAnimateStats(false), 200);
        }
        
        return newValue;
      });
    }, 1500);

    setTimeout(() => {
      const initialCount = Math.floor(Math.random() * 10) + 5;
      setPeopleInFrame(initialCount);
      setTotalPeopleSeen(initialCount);
      setAnimateStats(true);
      setTimeout(() => setAnimateStats(false), 200);
    }, 1000);

    return () => clearInterval(interval);
  }, [videoUrl]);

  const capacityPercentage = (peopleInFrame / MAX_ROOM_CAPACITY) * 100;

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <DashboardHeader isActive={!!videoUrl} />

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Video Panel - 60% */}
          <div className="lg:w-[60%]">
            <div className="gov-card h-full">
              <div className="px-5 py-3 border-b border-border bg-secondary/30 flex items-center justify-between">
                <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Video Feed
                </h2>
                {videoFile && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {videoFile.name}
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="aspect-video">
                  <VideoUploader
                    onVideoSelect={handleVideoSelect}
                    videoUrl={videoUrl}
                    onClear={handleClearVideo}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stats Panel - 40% */}
          <div className="lg:w-[40%] space-y-4">
            <div className="gov-card">
              <div className="px-5 py-3 border-b border-border bg-secondary/30">
                <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Live Analytics
                </h2>
              </div>
              <div className="p-4 space-y-4">
                <StatCard
                  label="People in Frame"
                  value={peopleInFrame}
                  icon={<Users className="w-4 h-4" />}
                  animate={animateStats}
                />

                <StatCard
                  label="Total People Detected"
                  value={totalPeopleSeen}
                  icon={<UserCheck className="w-4 h-4" />}
                  animate={animateStats}
                />
              </div>
            </div>

            <CapacityMeter
              percentage={capacityPercentage}
              currentCount={peopleInFrame}
              maxCapacity={MAX_ROOM_CAPACITY}
            />

            {/* Info Notice */}
            <div className="gov-card p-4">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    System Information
                  </h3>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    <li>• Upload surveillance footage for automated head count analysis</li>
                    <li>• Real-time tracking of current occupancy levels</li>
                    <li>• Cumulative count of all detected individuals</li>
                    <li>• Capacity alerts when thresholds are exceeded</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Occupancy Monitoring System v1.0 • Public Safety Division • For Official Use Only
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
