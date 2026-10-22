import { useState } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { chevronBack, chevronForward } from 'ionicons/icons';
import { toDateKey } from '../services/utils';

const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Month grid. Each day shows one dot per class: green present, red absent,
// grey cancelled. `onSelect(dateKey)` fires when a day is tapped.
export default function AttendanceCalendar({ records, onSelect }) {
  const now = new Date();
  const [month, setMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const today = toDateKey();

  const year = month.getFullYear();
  const m = month.getMonth();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const leading = (month.getDay() + 6) % 7; // Monday-first grid
  const isCurrentMonth = year === now.getFullYear() && m === now.getMonth();

  const byDate = {};
  for (const r of records) (byDate[r.date] ??= []).push(r);

  const cells = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toDateKey(new Date(year, m, i + 1))),
  ];

  return (
    <div className="calendar">
      <div className="calendar-head">
        <IonButton fill="clear" size="small" onClick={() => setMonth(new Date(year, m - 1, 1))} aria-label="Previous month">
          <IonIcon slot="icon-only" icon={chevronBack} />
        </IonButton>
        <strong>{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</strong>
        <IonButton
          fill="clear" size="small" disabled={isCurrentMonth}
          onClick={() => setMonth(new Date(year, m + 1, 1))} aria-label="Next month"
        >
          <IonIcon slot="icon-only" icon={chevronForward} />
        </IonButton>
      </div>
      <div className="calendar-grid">
        {WEEK.map((d, i) => <span key={i} className="calendar-weekday">{d}</span>)}
        {cells.map((key, i) =>
          key ? (
            <button
              key={key} type="button" disabled={key > today}
              className={`calendar-day ${key === today ? 'today' : ''}`}
              onClick={() => onSelect(key)}
            >
              <span>{Number(key.slice(8))}</span>
              <span className="dots">
                {(byDate[key] ?? []).slice(0, 3).map((r) => <i key={r.id} className={r.status} />)}
              </span>
            </button>
          ) : <span key={`b${i}`} />
        )}
      </div>
      <div className="calendar-legend">
        <span><i className="present" /> Present</span>
        <span><i className="absent" /> Absent</span>
        <span><i className="cancelled" /> Cancelled</span>
      </div>
    </div>
  );
}
