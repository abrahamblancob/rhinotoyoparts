interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: { value: number; label: string };
  color?: string;
}

export function StatsCard({ title, value, icon, trend, color = '#D3010A' }: StatsCardProps) {
  return (
    <div className="rh-stat-card">
      <div className="rh-stat-card-header">
        <div
          className="rh-stat-card-icon"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
        {trend && (
          <span
            className="rh-stat-card-trend"
            style={{
              backgroundColor: trend.value >= 0 ? '#10B98115' : '#D3010A15',
              color: trend.value >= 0 ? '#10B981' : '#D3010A',
            }}
          >
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </span>
        )}
      </div>
      <p className="rh-stat-card-value">{value}</p>
      <p className="rh-stat-card-label">{title}</p>
    </div>
  );
}
