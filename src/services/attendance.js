// Attendance maths. Percentages are always derived from the records,
// never stored, so editing a past mark updates every screen.

export function subjectStats(subject, records) {
  const own = records.filter((r) => r.subjectId === subject.id);
  const present = own.filter((r) => r.status === 'present').length;
  const absent = own.filter((r) => r.status === 'absent').length;
  const cancelled = own.filter((r) => r.status === 'cancelled').length;
  const attended = (subject.initialAttended || 0) + present;
  const total = (subject.initialTotal || 0) + present + absent;
  const percent = total ? (attended / total) * 100 : null;
  return { attended, total, present, absent, cancelled, percent, target: subject.target };
}

export function overallStats(subjects, records) {
  let attended = 0;
  let total = 0;
  for (const s of subjects) {
    const st = subjectStats(s, records);
    attended += st.attended;
    total += st.total;
  }
  return { attended, total, percent: total ? (attended / total) * 100 : null };
}

// Classes in a row you must attend to reach the target.
//   (A + x) / (T + x) >= t  =>  x >= (tT - A) / (1 - t)
export function classesNeeded(attended, total, targetPercent) {
  const t = targetPercent / 100;
  if (t >= 1) return attended === total ? 0 : Infinity;
  return Math.max(0, Math.ceil((t * total - attended) / (1 - t) - 1e-9));
}

// Classes you can miss and still stay at or above the target.
//   A / (T + y) >= t  =>  y <= (A - tT) / t
export function classesCanMiss(attended, total, targetPercent) {
  const t = targetPercent / 100;
  if (t <= 0) return Infinity;
  return Math.max(0, Math.floor((attended - t * total) / t + 1e-9));
}

export function projectedPercent(attended, total, attendNext, missNext) {
  const T = total + attendNext + missNext;
  return T ? ((attended + attendNext) / T) * 100 : null;
}

// 'safe' | 'warning' | 'danger' | 'none'
export function statusOf(percent, target) {
  if (percent === null) return 'none';
  if (percent < target) return 'danger';
  if (percent < target + 5) return 'warning';
  return 'safe';
}

export function adviceText({ attended, total, percent, target }) {
  if (!total) return 'No classes marked yet';
  if (percent >= target) {
    const n = classesCanMiss(attended, total, target);
    if (n === 0) return "On track — don't miss the next class";
    return `On track — you can miss ${n} more class${n === 1 ? '' : 'es'}`;
  }
  const n = classesNeeded(attended, total, target);
  return `Attend the next ${n} class${n === 1 ? '' : 'es'} to reach ${target}%`;
}

export const formatPercent = (p) => (p === null ? '—' : `${Math.round(p * 10) / 10}%`);
