import { sourceMeta } from '../lib/meta';
import { num } from '../lib/format';

export default function SourceBreakdown({ items = [], total = 0 }) {
  if (!items.length) {
    return <div className="empty"><div className="emoji">📊</div><h4>No sources yet</h4><p>Leads will be grouped by ad platform here.</p></div>;
  }
  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <div style={{ padding: '6px 16px 14px' }}>
      {items.map((item) => {
        const meta = sourceMeta(item.source);
        const share = total ? Math.round((item.count / total) * 100) : 0;
        return (
          <div className="source-row" key={item.source}>
            <span className="src-dot" style={{ background: meta.color }} aria-hidden="true">
              {meta.letter}
            </span>
            <div className="source-bars">
              <div className="source-meta">
                <span>{meta.label}</span>
                <span style={{ color: 'var(--muted)', fontWeight: 500 }}>
                  {share}% · {num(item.count)}
                </span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${Math.max(4, (item.count / max) * 100)}%`,
                    background: `linear-gradient(90deg, ${meta.color}, ${meta.color}bb)`,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
