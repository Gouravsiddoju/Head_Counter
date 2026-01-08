import { Building2 } from "lucide-react";

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

  const getGlowColor = () => {
    if (percentage >= 90) return "shadow-[0_0_20px_hsl(0,84%,60%/0.5)]";
    if (percentage >= 70) return "shadow-[0_0_20px_hsl(38,92%,50%/0.5)]";
    return "shadow-[0_0_20px_hsl(142,76%,45%/0.5)]";
  };

  return (
    <div className="glass-card glow-border p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <Building2 className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Room Capacity
          </span>
        </div>
        <span className="text-sm text-muted-foreground">
          {currentCount} / {maxCapacity}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className={`text-5xl font-bold font-mono ${getStatusColor()}`}>
            {percentage.toFixed(0)}
          </span>
          <span className="text-2xl font-medium text-muted-foreground">%</span>
        </div>

        <div className="relative h-4 rounded-full bg-secondary overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${getProgressColor()} ${getGlowColor()}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />
        </div>

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Empty</span>
          <span>Half</span>
          <span>Full</span>
        </div>
      </div>

      {percentage >= 90 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-sm text-destructive font-medium">Near Capacity</span>
        </div>
      )}
    </div>
  );
};

export default CapacityMeter;
