import { sourceMeta, statusMeta } from '../lib/meta';

export function StatusBadge({ status }) {
  const meta = statusMeta(status);
  return (
    <span className={`pill pill-${meta.id}`}>
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

export function SourceDot({ source, size = 8 }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: sourceMeta(source).color,
        display: 'inline-block',
        flex: '0 0 auto',
      }}
    />
  );
}
