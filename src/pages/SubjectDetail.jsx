import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  IonBackButton, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonNote, IonPage, IonTitle,
  IonToolbar, useIonActionSheet, useIonAlert, useIonRouter,
} from '@ionic/react';
import { add, attachOutline, createOutline, remove, trashOutline } from 'ionicons/icons';
import { useData } from '../context/DataContext';
import ProgressRing from '../components/ProgressRing';
import SubjectForm from '../components/SubjectForm';
import RecordSheet from '../components/RecordSheet';
import AttendanceCalendar from '../components/AttendanceCalendar';
import {
  adviceText, classesCanMiss, classesNeeded, formatPercent, projectedPercent, statusOf, subjectStats,
} from '../services/attendance';
import { DAYS, STATUS, dayLabel, formatTime, fromDateKey, sortSlots } from '../services/utils';
import { tap } from '../services/native';

function Stepper({ label, value, onChange }) {
  return (
    <div className="stepper">
      <span>{label}</span>
      <div>
        <IonButton fill="outline" size="small" disabled={value === 0} onClick={() => { tap(); onChange(value - 1); }} aria-label={`Decrease ${label}`}>
          <IonIcon slot="icon-only" icon={remove} />
        </IonButton>
        <strong>{value}</strong>
        <IonButton fill="outline" size="small" onClick={() => { tap(); onChange(value + 1); }} aria-label={`Increase ${label}`}>
          <IonIcon slot="icon-only" icon={add} />
        </IonButton>
      </div>
    </div>
  );
}

export default function SubjectDetail() {
  const { id } = useParams();
  const { subjects, slots, records, deleteSubject } = useData();
  const router = useIonRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [attendNext, setAttendNext] = useState(0);
  const [missNext, setMissNext] = useState(0);
  const [presentAlert] = useIonAlert();
  const [presentActionSheet] = useIonActionSheet();

  const subject = subjects.find((s) => s.id === id);
  if (!subject) {
    return (
      <IonPage>
        <IonHeader><IonToolbar><IonButtons slot="start"><IonBackButton defaultHref="/subjects" /></IonButtons></IonToolbar></IonHeader>
        <IonContent className="ion-padding"><p>This subject no longer exists.</p></IonContent>
      </IonPage>
    );
  }

  const st = subjectStats(subject, records);
  const own = records.filter((r) => r.subjectId === id).sort((a, b) => b.date.localeCompare(a.date));
  const ownSlots = sortSlots(slots.filter((s) => s.subjectId === id)).sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7));
  const projected = projectedPercent(st.attended, st.total, attendNext, missNext);
  const status = statusOf(st.percent, subject.target);

  const selectDay = (date) => {
    const onDay = own.filter((r) => r.date === date);
    if (onDay.length === 1) return setSheet(onDay[0]);
    if (onDay.length > 1) {
      return presentActionSheet({
        header: dayLabel(date),
        buttons: [
          ...onDay.map((r, i) => ({ text: `Class ${i + 1}: ${STATUS[r.status].label}`, handler: () => setSheet(r) })),
          { text: 'Cancel', role: 'cancel' },
        ],
      });
    }
    // Nothing marked: use the timetable slot for that weekday if there is one.
    const slot = ownSlots.find((s) => s.day === fromDateKey(date).getDay());
    setSheet({ subjectId: id, date, slotId: slot?.id ?? null });
  };

  const confirmDelete = () =>
    presentAlert({
      header: `Delete ${subject.name}?`,
      message: 'Its timetable entries and all attendance records will be deleted.',
      buttons: ['Cancel', {
        text: 'Delete', role: 'destructive',
        handler: async () => {
          router.goBack();
          await deleteSubject(id);
        },
      }],
    });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/subjects" /></IonButtons>
          <IonTitle>{subject.name}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setEditOpen(true)} aria-label="Edit subject">
              <IonIcon slot="icon-only" icon={createOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className={`detail-hero ${status}`} style={{ '--subject-color': subject.color }}>
          <ProgressRing percent={st.percent} target={subject.target} size={120} stroke={11} />
          <div>
            {subject.teacher && <p className="teacher">{subject.teacher}</p>}
            <p className="advice-big">{adviceText(st)}</p>
            <p className="target-line">Target {subject.target}%</p>
          </div>
        </div>

        <div className="stat-grid">
          <div><strong>{st.attended}</strong><small>Attended</small></div>
          <div><strong>{st.total - st.attended}</strong><small>Missed</small></div>
          <div><strong>{st.total}</strong><small>Total</small></div>
          <div><strong>{st.cancelled}</strong><small>Cancelled</small></div>
        </div>

        <IonCard>
          <IonCardHeader><IonCardTitle>What if…?</IonCardTitle></IonCardHeader>
          <IonCardContent>
            <Stepper label="I attend the next" value={attendNext} onChange={setAttendNext} />
            <Stepper label="I miss the next" value={missNext} onChange={setMissNext} />
            <div className={`projection ${statusOf(projected, subject.target)}`}>
              <span>My attendance will be</span>
              <strong>{formatPercent(projected)}</strong>
            </div>
            <p className="calc-hint">
              {st.percent === null
                ? 'Mark a few classes to see predictions.'
                : st.percent >= subject.target
                  ? `You can miss ${classesCanMiss(st.attended, st.total, subject.target)} classes in a row and stay at ${subject.target}%.`
                  : `You need ${classesNeeded(st.attended, st.total, subject.target)} classes in a row to get back to ${subject.target}%.`}
            </p>
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardHeader><IonCardTitle>History</IonCardTitle></IonCardHeader>
          <IonCardContent>
            <AttendanceCalendar records={own} onSelect={selectDay} />
          </IonCardContent>
        </IonCard>

        {own.length > 0 && (
          <IonList inset>
            {own.slice(0, 15).map((r) => (
              <IonItem key={r.id} button detail={false} onClick={() => setSheet(r)}>
                <span className={`status-dot ${r.status}`} slot="start" />
                <IonLabel>
                  <h3>{dayLabel(r.date)}</h3>
                  {(r.note || r.extra) && <p>{r.extra ? 'Extra class' : ''}{r.extra && r.note ? ' · ' : ''}{r.note}</p>}
                </IonLabel>
                {r.photo && <IonIcon icon={attachOutline} slot="end" color="medium" />}
                <IonNote slot="end" className={`status-text ${r.status}`}>{STATUS[r.status].label}</IonNote>
              </IonItem>
            ))}
          </IonList>
        )}

        <IonList inset>
          <IonItem lines="full"><IonLabel><h2>Weekly schedule</h2></IonLabel></IonItem>
          {ownSlots.length === 0 ? (
            <IonItem button onClick={() => router.push('/timetable')}>
              <IonLabel color="medium">Not in your timetable yet — tap to add</IonLabel>
            </IonItem>
          ) : ownSlots.map((s) => (
            <IonItem key={s.id}>
              <IonLabel>{DAYS.find((d) => d.value === s.day).long}</IonLabel>
              <IonNote slot="end">{formatTime(s.start)} – {formatTime(s.end)}{s.room ? ` · ${s.room}` : ''}</IonNote>
            </IonItem>
          ))}
        </IonList>

        <div className="ion-padding">
          <IonButton expand="block" fill="clear" color="danger" onClick={confirmDelete}>
            <IonIcon icon={trashOutline} slot="start" /> Delete subject
          </IonButton>
        </div>

        <SubjectForm isOpen={editOpen} subject={subject} onClose={() => setEditOpen(false)} />
        <RecordSheet target={sheet} onClose={() => setSheet(null)} />
      </IonContent>
    </IonPage>
  );
}
