import { Building2, AlertTriangle } from "lucide-react";

interface CapacityMeterProps {
  percentage: number;
  currentCount: number;
  maxCapacity: number;
}

const CapacityMeter = ({ percentage, currentCount, maxCapacity }: CapacityMeterProps) => {
  const getStatusColor = () => {
    if (percentage >= 90) return "text-destructive";
    if (percentage >= 70) return "text-warning";
    return "text-success";
  };

  const getProgressColor = () => {
    if (percentage >= 90) return "bg-destructive";
    if (percentage >= 70) return "bg-warning";
    return "bg-success";
  };

  const getStatusLabel = () => {
    if (percentage >= 90) return "CRITICAL";
    if (percentage >= 70) return "WARNING";
    return "NORMAL";
  };

  return (
    <div className="gov-card">
      {/* Card Header */}
      <div className="px-5 py-3 border-b border-border bg-secondary/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Room Capacity Status
            </span>
          </div>
          <span className={`gov-badge ${
            percentage >= 90 
              ? "bg-destructive/10 border-destructive/30 text-destructive" 
              : percentage >= 70 
                ? "bg-warning/10 border-warning/30 text-warning"
                : "bg-success/10 border-success/30 text-success"
          }`}>
            {getStatusLabel()}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <span className={`text-4xl font-bold font-mono ${getStatusColor()}`}>
              {percentage.toFixed(0)}%
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Current / Max</p>
            <p className="text-lg font-semibold font-mono text-foreground">
              {currentCount} / {maxCapacity}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="gov-progress">
            <div
              className={`gov-progress-bar ${getProgressColor()}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground font-medium">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Alert Banner */}
        {percentage >= 90 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-destructive">Capacity Alert</p>
              <p className="text-xs text-destructive/80">Room is approaching maximum occupancy limit</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CapacityMeter;
