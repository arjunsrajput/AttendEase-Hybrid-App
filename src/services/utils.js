export const SUBJECT_COLORS = [
  '#0d9488', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#ca8a04',
  '#16a34a', '#0891b2', '#dc2626', '#4f46e5', '#9333ea', '#64748b',
];

// JS getDay() numbering: 0 = Sunday … 6 = Saturday.
export const DAYS = [
  { value: 1, short: 'Mon', long: 'Monday' },
  { value: 2, short: 'Tue', long: 'Tuesday' },
  { value: 3, short: 'Wed', long: 'Wednesday' },
  { value: 4, short: 'Thu', long: 'Thursday' },
  { value: 5, short: 'Fri', long: 'Friday' },
  { value: 6, short: 'Sat', long: 'Saturday' },
  { value: 0, short: 'Sun', long: 'Sunday' },
];

export const STATUS = {
  present: { label: 'Present', color: 'success' },
  absent: { label: 'Absent', color: 'danger' },
  cancelled: { label: 'Cancelled', color: 'medium' },
};

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const pad = (n) => String(n).padStart(2, '0');

export function toDateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function shiftDate(key, days) {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

export function dayLabel(key) {
  const today = toDateKey();
  if (key === today) return 'Today';
  if (key === shiftDate(today, -1)) return 'Yesterday';
  return fromDateKey(key).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
}

export function longDate(key) {
  return fromDateKey(key).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

// 'HH:mm' -> minutes since midnight
export const toMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export function formatTime(time) {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${pad(m)} ${suffix}`;
}

export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const sortSlots = (slots) =>
  [...slots].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
