import { useState } from 'react';
import {
  IonButton, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonLabel, IonPage,
  IonSegment, IonSegmentButton, IonTitle, IonToolbar, useIonRouter,
} from '@ionic/react';
import { add, calendarClearOutline, locationOutline } from 'ionicons/icons';
import { useData } from '../context/DataContext';
import SlotForm from '../components/SlotForm';
import { DAYS, formatDuration, formatTime, sortSlots, toMinutes } from '../services/utils';

export default function Timetable() {
  const { subjects, slots } = useData();
  const router = useIonRouter();
  const [day, setDay] = useState(() => new Date().getDay() || 1);
  const [form, setForm] = useState(null); // { slot } or { slot: null }

  const subjectById = Object.fromEntries(subjects.map((s) => [s.id, s]));
  const daySlots = sortSlots(slots.filter((s) => s.day === day && subjectById[s.subjectId]));
  const countFor = (d) => slots.filter((s) => s.day === d).length;
  const weeklyHours = slots.reduce((sum, s) => sum + toMinutes(s.end) - toMinutes(s.start), 0);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar><IonTitle>Timetable</IonTitle></IonToolbar>
        <IonToolbar>
          <IonSegment scrollable value={day} onIonChange={(e) => setDay(Number(e.detail.value))}>
            {DAYS.map((d) => (
              <IonSegmentButton key={d.value} value={d.value}>
                <IonLabel>{d.short}</IonLabel>
                {countFor(d.value) > 0 && <span className="seg-count">{countFor(d.value)}</span>}
              </IonSegmentButton>
            ))}
          </IonSegment>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {subjects.length === 0 ? (
          <div className="empty-state">
            <IonIcon icon={calendarClearOutline} />
            <p>Add your subjects first, then build your weekly timetable here.</p>
            <IonButton fill="outline" size="small" onClick={() => router.push('/subjects')}>Go to subjects</IonButton>
          </div>
        ) : daySlots.length === 0 ? (
          <div className="empty-state">
            <IonIcon icon={calendarClearOutline} />
            <p>No classes on {DAYS.find((d) => d.value === day).long}.<br />Tap <strong>+</strong> to add one.</p>
          </div>
        ) : (
          <div className="timeline">
            {daySlots.map((slot) => {
              const subject = subjectById[slot.subjectId];
              return (
                <button
                  key={slot.id} type="button" className="timeline-row"
                  style={{ '--subject-color': subject.color }} onClick={() => setForm({ slot })}
                >
                  <div className="timeline-time">
                    <strong>{formatTime(slot.start)}</strong>
                    <small>{formatTime(slot.end)}</small>
                  </div>
                  <div className="timeline-card">
                    <strong>{subject.name}</strong>
                    <span>
                      {formatDuration(toMinutes(slot.end) - toMinutes(slot.start))}
                      {slot.room && <> · <IonIcon icon={locationOutline} /> {slot.room}</>}
                    </span>
                    {subject.teacher && <span>{subject.teacher}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {slots.length > 0 && (
          <p className="timetable-summary">
            {slots.length} classes a week · {formatDuration(weeklyHours)} of lectures
          </p>
        )}
        <div className="bottom-spacer" />

        {subjects.length > 0 && (
          <IonFab slot="fixed" vertical="bottom" horizontal="end">
            <IonFabButton onClick={() => setForm({ slot: null })} aria-label="Add class">
              <IonIcon icon={add} />
            </IonFabButton>
          </IonFab>
        )}
        <SlotForm isOpen={!!form} slot={form?.slot ?? null} day={day} onClose={() => setForm(null)} />
      </IonContent>
    </IonPage>
  );
}
