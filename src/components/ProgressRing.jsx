import { statusOf } from '../services/attendance';

const COLORS = {
  safe: 'var(--app-safe)',
  warning: 'var(--app-warning)',
  danger: 'var(--app-danger)',
  none: 'var(--app-muted)',
};

// Circular percentage indicator with a small tick at the target.
export default function ProgressRing({ percent, target = 75, size = 64, stroke = 7, label, light = false }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const value = percent ?? 0;
  const status = statusOf(percent, target);
  const color = light ? '#ffffff' : COLORS[status];
  const targetAngle = (target / 100) * 2 * Math.PI - Math.PI / 2;
  const tick = (offset) => size / 2 + (r + offset) * Math.cos(targetAngle);
  const tickY = (offset) => size / 2 + (r + offset) * Math.sin(targetAngle);

  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`${Math.round(value)} percent`}>
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
          stroke={light ? 'rgba(255,255,255,0.25)' : 'var(--app-track)'}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
          stroke={color} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(value, 100) / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <line
          x1={tick(-stroke / 2 - 2)} y1={tickY(-stroke / 2 - 2)}
          x2={tick(stroke / 2 + 2)} y2={tickY(stroke / 2 + 2)}
          stroke={light ? '#ffffff' : 'var(--ion-text-color)'} strokeWidth="2" opacity="0.6"
        />
      </svg>
      <span className="progress-ring-label" style={{ color: light ? '#fff' : undefined }}>
        {label ?? (percent === null ? '—' : `${Math.round(percent)}%`)}
      </span>
    </div>
  );
}
