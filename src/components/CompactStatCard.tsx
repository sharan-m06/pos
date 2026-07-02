import type { ReactNode } from "react";

type CompactStatCardProps = {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  detail?: ReactNode;
  valueClassName?: string;
};

export default function CompactStatCard({
  icon,
  value,
  label,
  detail,
  valueClassName = "",
}: CompactStatCardProps) {
  return (
    <div className="compact-stat-card">
      <span className="compact-stat-icon" aria-hidden="true">{icon}</span>
      <div className="compact-stat-body">
        <strong className={`compact-stat-value ${valueClassName}`}>{value}</strong>
        <span className="compact-stat-label">{label}</span>
        {detail != null ? <small className="compact-stat-detail">{detail}</small> : null}
      </div>
    </div>
  );
}