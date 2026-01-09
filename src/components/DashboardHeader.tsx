import { Shield, Activity } from "lucide-react";

interface DashboardHeaderProps {
  isActive: boolean;
}

const DashboardHeader = ({ isActive }: DashboardHeaderProps) => {
  return (
    <header className="gov-card overflow-hidden">
      {/* Government Header Bar */}
      <div className="gov-header px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5" />
            <span className="text-sm font-semibold tracking-wide uppercase">
              Public Safety Division
            </span>
          </div>
          <span className="text-xs opacity-80">
            Authorized Personnel Only
          </span>
        </div>
      </div>

      {/* Main Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-border bg-card">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Occupancy Monitoring System
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-Time Head Count Analytics Dashboard
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`
            gov-badge
            ${isActive 
              ? "bg-success/10 border-success/30 text-success" 
              : "bg-secondary border-border text-muted-foreground"
            }
          `}>
            <div className={`
              w-2 h-2 rounded-full 
              ${isActive ? "bg-success animate-pulse" : "bg-muted-foreground"}
            `} />
            <span className="font-semibold uppercase tracking-wide">
              {isActive ? "Active" : "Standby"}
            </span>
          </div>

          <div className="gov-badge bg-primary/5 border-primary/20 text-primary">
            <Activity className="w-3.5 h-3.5" />
            <span className="font-semibold uppercase tracking-wide">
              Monitoring
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
