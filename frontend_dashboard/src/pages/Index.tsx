import { useState, useEffect, useCallback } from "react";
import { Users, UserCheck, Info } from "lucide-react";
import VideoUploader from "@/components/VideoUploader";
import StatCard from "@/components/StatCard";
import CapacityMeter from "@/components/CapacityMeter";
import DashboardHeader from "@/components/DashboardHeader";

const Index = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [peopleInFrame, setPeopleInFrame] = useState(0);
  const [totalPeopleSeen, setTotalPeopleSeen] = useState(0);
  const [animateStats, setAnimateStats] = useState(false);
  const [maxCapacity, setMaxCapacity] = useState(125); // Default from backend
  const [totalArea, setTotalArea] = useState(100);
  const [occupiedArea, setOccupiedArea] = useState(0);

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

  // Fetch Real Data from Backend
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const fetchStats = async () => {
      try {
        const HOST = window.location.hostname;
        const response = await fetch(`http://${HOST}:5000/stats`);
        if (response.ok && isMounted) {
          const data = await response.json();
          console.log("Fetched Stats:", data); // Debug log

          setPeopleInFrame(data.current_count);
          setTotalPeopleSeen(data.total_people_seen);
          if (data.capacity > 0) setMaxCapacity(data.capacity);

          if (data.area_total_sqm) setTotalArea(data.area_total_sqm);
          if (data.area_used_sqm) setOccupiedArea(data.area_used_sqm);

          setAnimateStats(true);
          setTimeout(() => setAnimateStats(false), 200);
        }
      } catch (e) {
        // console.error("Waiting for stats.json...");
      } finally {
        // Schedule next fetch only after current one completes
        if (isMounted) {
          timeoutId = setTimeout(fetchStats, 500);
        }
      }
    };

    fetchStats();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const capacityPercentage = (peopleInFrame / maxCapacity) * 100;

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
                <div className="aspect-video bg-black rounded-lg overflow-hidden relative group">
                  {/* Live Stream View */}
                  <img
                    src="http://localhost:5000/video_feed"
                    alt="Live Analysis Feed"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      // Show fallback/loader if stream fails
                      e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                      e.currentTarget.parentElement!.innerHTML = '<div class="text-white text-sm">Waiting for Video Feed...<br/><span class="text-xs text-gray-400">Run python script to start</span></div>';
                    }}
                  />

                  {/* Status Overlay */}
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-green-400 font-mono flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    LIVE PROCESSING
                  </div>
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
              maxCapacity={maxCapacity}
              totalArea={totalArea}
              occupiedArea={occupiedArea}
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
