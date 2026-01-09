import { Building2, AlertTriangle, ChevronDown, Maximize2, Users } from "lucide-react";
import { useState } from "react";

interface CapacityMeterProps {
  percentage: number;
  currentCount: number;
  maxCapacity: number;
}

const CapacityMeter = ({ percentage, currentCount, maxCapacity }: CapacityMeterProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Simulated area values (in production, these would come from the ML model)
  const totalAreaSqFt = 850;
  const occupiedAreaSqFt = Math.round((percentage / 100) * totalAreaSqFt * 0.6);
  const areaPerPerson = currentCount > 0 ? (occupiedAreaSqFt / currentCount).toFixed(1) : 0;

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
      {/* Card Header - Clickable */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-3 border-b border-border bg-secondary/30 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Room Capacity Status
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`gov-badge ${
              percentage >= 90 
                ? "bg-destructive/10 border-destructive/30 text-destructive" 
                : percentage >= 70 
                  ? "bg-warning/10 border-warning/30 text-warning"
                  : "bg-success/10 border-success/30 text-success"
            }`}>
              {getStatusLabel()}
            </span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
          </div>
        </div>
      </button>

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

        {/* Expanded Area Details */}
        <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="pt-4 border-t border-border space-y-4">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Maximize2 className="w-3.5 h-3.5 text-primary" />
              Spatial Analysis
            </h4>

            <div className="grid grid-cols-2 gap-3">
              {/* Total Area */}
              <div className="p-4 rounded bg-secondary/50 border border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Area</p>
                <p className="text-2xl font-bold font-mono text-foreground">
                  {totalAreaSqFt.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">sq. ft.</p>
              </div>

              {/* Occupied Area */}
              <div className="p-4 rounded bg-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Occupied Area</p>
                <p className="text-2xl font-bold font-mono text-primary">
                  {occupiedAreaSqFt.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">sq. ft.</p>
              </div>
            </div>

            {/* Area per person */}
            <div className="p-4 rounded bg-secondary/30 border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg. Space per Person</p>
                </div>
                <p className="text-lg font-bold font-mono text-foreground">
                  {areaPerPerson} <span className="text-xs font-normal text-muted-foreground">sq. ft.</span>
                </p>
              </div>
            </div>

            {/* Visual Area Representation */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Area Utilization</p>
              <div className="h-8 rounded bg-secondary overflow-hidden flex">
                <div 
                  className="h-full bg-primary/60 transition-all duration-500 flex items-center justify-center"
                  style={{ width: `${Math.min((occupiedAreaSqFt / totalAreaSqFt) * 100, 100)}%` }}
                >
                  {(occupiedAreaSqFt / totalAreaSqFt) * 100 > 15 && (
                    <span className="text-xs font-semibold text-primary-foreground">
                      {((occupiedAreaSqFt / totalAreaSqFt) * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">Available</span>
                </div>
              </div>
            </div>
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

        {/* Exceeded Capacity Alert */}
        {percentage > 100 && (
          <div className="p-4 rounded bg-destructive/15 border-2 border-destructive/40 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <p className="text-sm font-bold text-destructive uppercase tracking-wide">Capacity Exceeded</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded bg-background/50 border border-destructive/20">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Exceeded By</p>
                <p className="text-2xl font-bold font-mono text-destructive">
                  +{(percentage - 100).toFixed(1)}%
                </p>
              </div>
              <div className="p-3 rounded bg-background/50 border border-destructive/20">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Extra People</p>
                <p className="text-2xl font-bold font-mono text-destructive">
                  +{currentCount - maxCapacity}
                </p>
                <p className="text-xs text-muted-foreground">persons over limit</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CapacityMeter;
