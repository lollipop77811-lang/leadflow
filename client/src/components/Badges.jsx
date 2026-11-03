import { dueLabel, formatDate } from '../lib/format';
import { conditionLabel, fuelLabel, rcLabel, sourceMeta, statusMeta } from '../lib/meta';

export function StatusBadge({ status, small }) {
  const meta = statusMeta(status);
  return (
    <span
      className={`pill ${small ? 'pill-sm' : ''}`}
      style={{ background: `${meta.color}16`, color: meta.color }}
    >
      <span className="pdot" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

export function SourceTag({ source, showDot = true }) {
  const meta = sourceMeta(source);
  return (
    <span className="source-tag">
      {showDot && (
        <span className="src-dot" style={{ background: meta.color }} aria-hidden="true">
          {meta.letter}
        </span>
      )}
      {meta.label}
    </span>
  );
}

export function Chip({ children, color = '#475569', bg, style }) {
  return (
    <span
      className="chip"
      style={{ color, background: bg || `${color}12`, borderColor: `${color}33`, ...style }}
    >
      {children}
    </span>
  );
}

export function VehicleLine({ lead, showMeta = true }) {
  const v = lead?.vehicle || {};
  const name = [v.make, v.model].filter(Boolean).join(' ') || 'Vehicle not specified';
  return (
    <span className="vehicle-line">
      <b>{name}</b>
      {showMeta && (
        <span className="vehicle-meta">
          {v.year ? ` · ${v.year}` : ''}
          {v.fuel ? ` · ${fuelLabel(v.fuel)}` : ''}
        </span>
      )}
    </span>
  );
}

export function DuplicateBadge({ count }) {
  if (!count) return null;
  return (
    <Chip color="#b45309" bg="#fff7ed" style={{ fontWeight: 650 }}>
      ↺ repeat enquiry
    </Chip>
  );
}

export function FollowUpChip({ date, status }) {
  if (!date || ['paid', 'lost'].includes(status)) return null;
  const overdue = new Date(date) < new Date(new Date().setHours(0, 0, 0, 0));
  return (
    <Chip color={overdue ? '#b91c1c' : '#1d4ed8'} bg={overdue ? '#fef2f2' : '#eff6ff'}>
      {overdue ? '⚠ ' : '⏰ '}
      {dueLabel(date)}
    </Chip>
  );
}

export function VehicleSpecs({ lead }) {
  const v = lead?.vehicle || {};
  return (
    <div className="spec-row">
      <Chip color="#475569">{conditionLabel(v.condition)}</Chip>
      <Chip color={v.rcStatus === 'original' ? '#047857' : v.rcStatus === 'lost' ? '#b91c1c' : '#6d28d9'}>
        {rcLabel(v.rcStatus)}
      </Chip>
      {v.registrationNumber && <Chip color="#475569">{v.registrationNumber}</Chip>}
      {lead?.pickup?.pincode && (
        <Chip color="#475569">
          {lead.pickup.city || '—'} {lead.pickup.pincode}
        </Chip>
      )}
    </div>
  );
}

export function PickupLine({ pickup }) {
  if (!pickup?.scheduledDate) return null;
  return (
    <span className="pickup-line">
      🚚 {formatDate(pickup.scheduledDate)} {pickup.slot ? `· ${pickup.slot}` : ''}
    </span>
  );
}

export function DocProgress({ documents, total = 6 }) {
  const done = documents ? Object.values(documents).filter(Boolean).length : 0;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="doc-progress" title={`${done} of ${total} documents collected`}>
      <div className="doc-progress-bar">
        <div style={{ width: `${pct}%`, background: pct === 100 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444' }} />
      </div>
      <span>{done}/{total}</span>
    </div>
  );
}
