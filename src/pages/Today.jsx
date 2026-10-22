import { useEffect, useMemo, useState } from 'react';
import {
  IonButton, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar,
  useIonActionSheet, useIonAlert, useIonRouter, useIonToast,
} from '@ionic/react';
import {
  addCircleOutline, cafeOutline, checkmarkCircle, chevronBack, chevronForward, closeCircle,
  ellipsisHorizontal, locationOutline, removeCircle, schoolOutline, sparklesOutline, sunnyOutline,
  timeOutline, attachOutline,
} from 'ionicons/icons';
import { useData } from '../context/DataContext';
import ProgressRing from '../components/ProgressRing';
import RecordSheet from '../components/RecordSheet';
import { formatPercent, overallStats, subjectStats } from '../services/attendance';
import {
  dayLabel, formatDuration, formatTime, fromDateKey, shiftDate, sortSlots, toDateKey, toMinutes,
} from '../services/utils';
import { tap, warning } from '../services/native';

const STATUS_BUTTONS = [
  { status: 'present', label: 'Present', icon: checkmarkCircle },
  { status: 'absent', label: 'Absent', icon: closeCircle },
  { status: 'cancelled', label: 'Cancelled', icon: removeCircle },
];

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function Today() {
  const { subjects, slots, records, settings, mark, markExtra, deleteRecord, loadSample } = useData();
  const router = useIonRouter();
  const now = useNow();
  const today = toDateKey(now);
  const [date, setDate] = useState(today);
  const [sheet, setSheet] = useState(null);
  const [presentToast] = useIonToast();
  const [presentAlert] = useIonAlert();
  const [presentActionSheet] = useIonActionSheet();

  const subjectById = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s])), [subjects]);
  const weekday = fromDateKey(date).getDay();
  const daySlots = sortSlots(slots.filter((s) => s.day === weekday && subjectById[s.subjectId]));
  const dayRecords = records.filter((r) => r.date === date);
  const extras = dayRecords.filter((r) => !r.slotId || !daySlots.some((s) => s.id === r.slotId));
  const overall = overallStats(subjects, records);
  const belowTarget = subjects.filter((s) => {
    const st = subjectStats(s, records);
    return st.percent !== null && st.percent < s.target;
  });

  // Ongoing or upcoming class, only when looking at today.
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const current = date === today && daySlots.find((s) => toMinutes(s.start) <= nowMin && nowMin < toMinutes(s.end));
  const next = date === today && !current && daySlots.find((s) => toMinutes(s.start) > nowMin);

  const onMark = async (slot, status) => {
    tap();
    const existing = dayRecords.find((r) => r.slotId === slot.id);
    if (existing?.status === status) return deleteRecord(existing.id); // tap again to clear
    const subject = subjectById[slot.subjectId];
    const before = subjectStats(subject, records).percent;
    await mark(slot.subjectId, date, slot.id, status);
    if (status === 'absent') {
      // Recompute from a copy of the records — React state updates asynchronously.
      const nextRecords = existing
        ? records.map((r) => (r.id === existing.id ? { ...r, status } : r))
        : [...records, { subjectId: subject.id, status }];
      const after = subjectStats(subject, nextRecords).percent;
      if (after !== null && after < subject.target && (before === null || before >= subject.target)) {
        warning();
        presentToast({
          message: `${subject.name} dropped below ${subject.target}% (${formatPercent(after)})`,
          color: 'danger', duration: 2800, position: 'top',
        });
      }
    }
  };

  const addExtra = () =>
    presentActionSheet({
      header: 'Extra class — which subject?',
      buttons: [
        ...subjects.map((s) => ({ text: s.name, handler: () => { markExtra(s.id, date, 'present'); tap(); } })),
        { text: 'Cancel', role: 'cancel' },
      ],
    });

  const markHoliday = () =>
    presentAlert({
      header: 'Mark as holiday?',
      message: `All ${daySlots.length} classes on ${dayLabel(date).toLowerCase()} will be marked as cancelled. They won't affect your attendance.`,
      buttons: ['Cancel', {
        text: 'Mark holiday',
        handler: async () => {
          for (const slot of daySlots) await mark(slot.subjectId, date, slot.id, 'cancelled');
        },
      }],
    });

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (!subjects.length) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border"><IonToolbar><IonTitle>AttendEase</IonTitle></IonToolbar></IonHeader>
        <IonContent className="ion-padding">
          <div className="welcome">
            <div className="welcome-icon"><IonIcon icon={schoolOutline} /></div>
            <h1>Welcome to AttendEase</h1>
            <p>Track your attendance for every subject, get reminded before each class, and always know how many classes you can afford to miss.</p>
            <ol>
              <li>Add your subjects</li>
              <li>Set up your weekly timetable</li>
              <li>Mark attendance after each class — even from the notification</li>
            </ol>
            <IonButton expand="block" onClick={() => router.push('/subjects')}>
              <IonIcon icon={addCircleOutline} slot="start" /> Add my subjects
            </IonButton>
            <IonButton expand="block" fill="outline" onClick={loadSample}>
              <IonIcon icon={sparklesOutline} slot="start" /> Try with sample data
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar><IonTitle>AttendEase</IonTitle></IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="hero-card">
          <div className="hero-text">
            <p className="greeting">{greeting}{settings.studentName.trim() ? `, ${settings.studentName.trim().split(' ')[0]}` : ''} 👋</p>
            <p className="label">Overall attendance</p>
            <h1>{formatPercent(overall.percent)}</h1>
            <p className="sub">{overall.attended} of {overall.total} classes attended</p>
            {belowTarget.length > 0 ? (
              <span className="hero-chip danger">⚠ {belowTarget.length} subject{belowTarget.length > 1 ? 's' : ''} below target</span>
            ) : overall.total > 0 && (
              <span className="hero-chip">✓ All subjects on track</span>
            )}
          </div>
          <ProgressRing percent={overall.percent} target={settings.defaultTarget} size={104} stroke={10} light />
        </div>

        {(current || next) && (
          <div className="next-card" style={{ '--subject-color': subjectById[(current || next).subjectId].color }}>
            <IonIcon icon={timeOutline} />
            <div>
              <small>{current ? 'Happening now' : `Next class · in ${formatDuration(toMinutes(next.start) - nowMin)}`}</small>
              <strong>{subjectById[(current || next).subjectId].name}</strong>
              <span>
                {formatTime((current || next).start)} – {formatTime((current || next).end)}
                {(current || next).room && ` · ${(current || next).room}`}
              </span>
            </div>
          </div>
        )}

        <div className="date-switcher">
          <IonButton fill="clear" onClick={() => setDate(shiftDate(date, -1))} aria-label="Previous day">
            <IonIcon slot="icon-only" icon={chevronBack} />
          </IonButton>
          <button type="button" className="date-title" onClick={() => setDate(today)}>
            {dayLabel(date)}
            {date !== today && <small>tap to go to today</small>}
          </button>
          <IonButton fill="clear" disabled={date >= today} onClick={() => setDate(shiftDate(date, 1))} aria-label="Next day">
            <IonIcon slot="icon-only" icon={chevronForward} />
          </IonButton>
        </div>

        {daySlots.length === 0 && extras.length === 0 && (
          <div className="empty-state">
            <IonIcon icon={weekday === 0 ? sunnyOutline : cafeOutline} />
            <p>No classes in your timetable for {dayLabel(date).toLowerCase()}.</p>
            {slots.length === 0 && (
              <IonButton fill="outline" size="small" onClick={() => router.push('/timetable')}>Set up timetable</IonButton>
            )}
          </div>
        )}

        <div className="class-list">
          {daySlots.map((slot) => {
            const subject = subjectById[slot.subjectId];
            const record = dayRecords.find((r) => r.slotId === slot.id);
            const st = subjectStats(subject, records);
            return (
              <div key={slot.id} className={`class-card ${record?.status ?? ''}`} style={{ '--subject-color': subject.color }}>
                <div className="class-head">
                  <div className="class-info">
                    <strong>{subject.name}</strong>
                    <span>
                      <IonIcon icon={timeOutline} /> {formatTime(slot.start)} – {formatTime(slot.end)}
                      {slot.room && <><IonIcon icon={locationOutline} /> {slot.room}</>}
                    </span>
                  </div>
                  <span className={`pct-chip ${st.percent !== null && st.percent < subject.target ? 'danger' : ''}`}>
                    {formatPercent(st.percent)}
                  </span>
                  <IonButton
                    fill="clear" size="small" color="medium" aria-label="More options"
                    onClick={() => setSheet(record ?? { subjectId: subject.id, date, slotId: slot.id })}
                  >
                    <IonIcon slot="icon-only" icon={ellipsisHorizontal} />
                  </IonButton>
                </div>
                <div className="status-buttons">
                  {STATUS_BUTTONS.map((b) => (
                    <button
                      key={b.status} type="button"
                      className={`status-btn ${b.status} ${record?.status === b.status ? 'active' : ''}`}
                      onClick={() => onMark(slot, b.status)}
                    >
                      <IonIcon icon={b.icon} /> {b.label}
                    </button>
                  ))}
                </div>
                {(record?.note || record?.photo) && (
                  <p className="class-note">
                    {record.photo && <IonIcon icon={attachOutline} />} {record.note || 'Proof attached'}
                  </p>
                )}
              </div>
            );
          })}

          {extras.map((r) => {
            const subject = subjectById[r.subjectId];
            if (!subject) return null;
            return (
              <button
                key={r.id} type="button" className={`class-card extra ${r.status}`}
                style={{ '--subject-color': subject.color }} onClick={() => setSheet(r)}
              >
                <div className="class-info">
                  <strong>{subject.name}</strong>
                  <span>Extra class · {r.status}{r.note ? ` · ${r.note}` : ''}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="day-actions">
          <IonButton fill="outline" size="small" onClick={addExtra}>
            <IonIcon icon={addCircleOutline} slot="start" /> Extra class
          </IonButton>
          {daySlots.length > 0 && (
            <IonButton fill="outline" size="small" color="medium" onClick={markHoliday}>
              <IonIcon icon={sunnyOutline} slot="start" /> Holiday
            </IonButton>
          )}
        </div>
        <div className="bottom-spacer" />

        <RecordSheet target={sheet} onClose={() => setSheet(null)} />
      </IonContent>
    </IonPage>
  );
}
