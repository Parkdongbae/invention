import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { playSfx } from '../lib/sound';

const NEGATIVE_ICONS = ['⚠️', '❌', '😅', '🚨'];

// ===== 공용 UI 프리미티브 =====
export function Section(props: { title: string; sub?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section style={{ marginBottom: 30 }}>
      <div className="row" style={{ alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <h2 className="section-title">{props.title}</h2>
          {props.sub && <p className="section-sub" style={{ marginBottom: 0 }}>{props.sub}</p>}
        </div>
        <div className="spacer" />
        {props.right}
      </div>
      <div style={{ height: 12 }} />
      {props.children}
    </section>
  );
}

export function EmptyState(props: { icon: string; title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-ico">{props.icon}</div>
      <div className="empty-title">{props.title}</div>
      {props.sub && <div className="tiny">{props.sub}</div>}
      {props.children && <div style={{ marginTop: 14 }}>{props.children}</div>}
    </div>
  );
}

export function Modal(props: { open: boolean; onClose: () => void; title?: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!props.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [props.open, props.onClose]);

  if (!props.open) return null;
  return createPortal(
    <div className="modal-backdrop" onClick={props.onClose}>
      <div
        className="modal-panel"
        style={props.wide ? { maxWidth: 760 } : undefined}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {props.title && (
          <div className="row" style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800 }}>{props.title}</h3>
            <div className="spacer" />
            <button className="btn btn-ghost btn-sm" onClick={props.onClose} aria-label="닫기">✕</button>
          </div>
        )}
        {props.children}
      </div>
    </div>,
    document.body,
  );
}

// ===== 토스트 =====
let pushToastFn: ((msg: string, icon?: string) => void) | null = null;

export function toast(msg: string, icon = '✅'): void {
  pushToastFn?.(msg, icon);
}

export function ToastHost() {
  const [items, setItems] = useState<{ id: number; msg: string; icon: string }[]>([]);
  useEffect(() => {
    pushToastFn = (msg, icon = '✅') => {
      if (icon !== '🏅') playSfx(NEGATIVE_ICONS.includes(icon) ? 'oops' : 'success');
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, msg, icon }]);
      setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 2600);
    };
    return () => {
      pushToastFn = null;
    };
  }, []);
  return createPortal(
    <div className="toast-wrap" aria-live="polite">
      {items.map((i) => (
        <div key={i.id} className="toast">
          <span>{i.icon}</span>
          <span>{i.msg}</span>
        </div>
      ))}
    </div>,
    document.body,
  );
}

// ===== 별점 =====
export function StarRating(props: { value: number; onChange?: (v: number) => void; size?: number }) {
  const { value, onChange, size = 22 } = props;
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={onChange ? () => onChange(n) : undefined}
          style={{
            background: 'none', border: 'none', cursor: onChange ? 'pointer' : 'default',
            fontSize: size, padding: 0, lineHeight: 1,
            color: n <= value ? '#f59e0b' : '#d9d4c8',
          }}
          aria-label={`${n}점`}
        >
          ★
        </button>
      ))}
    </span>
  );
}

// ===== 확인 다이얼로그 =====
export function ConfirmButton(props: {
  onConfirm: () => void;
  children: ReactNode;
  className?: string;
  message?: string;
}) {
  const [arming, setArming] = useState(false);
  useEffect(() => {
    if (!arming) return;
    const t = setTimeout(() => setArming(false), 2600);
    return () => clearTimeout(t);
  }, [arming]);
  return (
    <button
      type="button"
      className={props.className ?? 'btn btn-sm'}
      style={arming ? { background: 'var(--danger)', borderColor: 'var(--danger)', color: '#fff' } : undefined}
      onClick={() => {
        if (arming) {
          setArming(false);
          props.onConfirm();
        } else {
          setArming(true);
        }
      }}
    >
      {arming ? (props.message ?? '정말 삭제할까요?') : props.children}
    </button>
  );
}
