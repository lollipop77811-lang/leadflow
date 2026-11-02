import Icon from './Icon';

export default function StatCard({ label, value, icon = 'trend', foot, tone = 'brand', trend }) {
  const tones = {
    brand: { bg: 'var(--brand-soft)', color: 'var(--brand)' },
    green: { bg: '#ecfdf5', color: '#047857' },
    amber: { bg: '#fff7ed', color: '#b45309' },
    violet: { bg: '#f5f3ff', color: '#6d28d9' },
    blue: { bg: '#eff6ff', color: '#1d4ed8' },
  };
  const t = tones[tone] || tones.brand;

  return (
    <div className="card kpi">
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <span className="kpi-ico" style={{ background: t.bg, color: t.color }}>
          <Icon name={icon} size={14} />
        </span>
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-foot">
        {trend && (
          <span className={`trend ${trend.dir}`}>
            {trend.dir === 'up' ? '▲' : trend.dir === 'down' ? '▼' : '•'} {trend.value}
          </span>
        )}
        {foot}
      </div>
    </div>
  );
}
