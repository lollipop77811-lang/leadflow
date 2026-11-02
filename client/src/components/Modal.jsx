import { useEffect } from 'react';
import Icon from './Icon';

export default function Modal({ title, subtitle, onClose, children, footer, width = 520 }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal" style={{ width: `min(${width}px, 100%)` }}>
        <div className="modal-head">
          <div style={{ flex: 1 }}>
            <h3>{title}</h3>
            {subtitle && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" size={15} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
