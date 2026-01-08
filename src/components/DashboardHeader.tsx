import { Activity, Camera } from "lucide-react";

interface DashboardHeaderProps {
  isActive: boolean;
}

const DashboardHeader = ({ isActive }: DashboardHeaderProps) => {
  return (
    <header className="flex items-center justify-between pb-6 border-b border-border">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-primary/10 text-primary">
          <Camera className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Head Count Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time people detection and counting
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className={`
          flex items-center gap-2 px-4 py-2 rounded-full 
          ${isActive 
            ? "bg-success/10 border border-success/20" 
            : "bg-secondary border border-border"
          }
        `}>
          <div className={`
            w-2.5 h-2.5 rounded-full 
            ${isActive ? "bg-success animate-pulse" : "bg-muted-foreground"}
          `} />
          <span className={`
            text-sm font-medium 
            ${isActive ? "text-success" : "text-muted-foreground"}
          `}>
            {isActive ? "Live" : "Idle"}
          </span>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            Monitoring
          </span>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
