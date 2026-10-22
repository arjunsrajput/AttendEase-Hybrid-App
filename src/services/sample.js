// Demo semester so the app can be explored (or presented) without typing everything in.
import { shiftDate, toDateKey, fromDateKey, uid } from './utils';

const SUBJECTS = [
  { name: 'Database Management', teacher: 'Prof. Mehta', color: '#0d9488', rate: 0.92 },
  { name: 'Operating Systems', teacher: 'Dr. Iyer', color: '#2563eb', rate: 0.78 },
  { name: 'Computer Networks', teacher: 'Prof. Khan', color: '#7c3aed', rate: 0.66 },
  { name: 'Mobile App Development', teacher: 'Dr. Rao', color: '#db2777', rate: 0.88 },
  { name: 'Engineering Maths', teacher: 'Prof. Gupta', color: '#ea580c', rate: 0.72 },
];

// [subjectIndex, day (1 = Mon), start, end, room]
const TIMETABLE = [
  [0, 1, '09:00', '10:00', 'Room 201'], [1, 1, '10:00', '11:00', 'Room 204'], [3, 1, '11:15', '13:15', 'Lab 3'],
  [2, 2, '09:00', '10:00', 'Room 105'], [4, 2, '10:00', '11:00', 'Room 201'], [0, 2, '11:15', '12:15', 'Room 201'],
  [1, 3, '09:00', '10:00', 'Room 204'], [2, 3, '10:00', '11:00', 'Room 105'], [3, 3, '11:15', '12:15', 'Room 302'],
  [4, 4, '09:00', '10:00', 'Room 201'], [0, 4, '10:00', '12:00', 'DB Lab'], [1, 4, '12:15', '13:15', 'Room 204'],
  [2, 5, '09:00', '10:00', 'Room 105'], [3, 5, '10:00', '11:00', 'Room 302'], [4, 5, '11:15', '12:15', 'Room 201'],
];

// Small deterministic random generator so the sample looks the same every time.
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function buildSampleData(target = 75) {
  const subjects = SUBJECTS.map(({ name, teacher, color }) => ({
    id: uid(), name, teacher, color, target, initialAttended: 0, initialTotal: 0,
  }));
  const slots = TIMETABLE.map(([si, day, start, end, room]) => ({
    id: uid(), subjectId: subjects[si].id, day, start, end, room,
  }));

  const random = seeded(42);
  const records = [];
  const today = toDateKey();
  // Six weeks of history, up to yesterday.
  for (let offset = 42; offset >= 1; offset--) {
    const date = shiftDate(today, -offset);
    const day = fromDateKey(date).getDay();
    for (const slot of slots.filter((s) => s.day === day)) {
      const si = subjects.findIndex((s) => s.id === slot.subjectId);
      const roll = random();
      const status = roll < 0.04 ? 'cancelled' : roll < SUBJECTS[si].rate ? 'present' : 'absent';
      records.push({ id: uid(), subjectId: slot.subjectId, slotId: slot.id, date, status, note: '' });
    }
  }
  return { subjects, slots, records };
}
