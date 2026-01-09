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
    <div className="gov-card p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <div className="p-2 rounded bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
      
      <div className="flex items-baseline gap-1.5">
        <span className={`stat-value ${animate ? "animate-count" : ""}`}>
          {value}
        </span>
        {suffix && (
          <span className="text-lg font-medium text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
};

export default StatCard;
