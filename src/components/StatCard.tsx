import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: number;
  icon: ReactNode;
  suffix?: string;
  animate?: boolean;
}

const StatCard = ({ label, value, icon, suffix = "", animate = false }: StatCardProps) => {
  return (
    <div className="glass-card glow-border p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      
      <div className="flex items-baseline gap-2">
        <span className={`stat-value ${animate ? "animate-count" : ""}`}>
          {value}
        </span>
        {suffix && (
          <span className="text-xl font-medium text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
};

export default StatCard;
