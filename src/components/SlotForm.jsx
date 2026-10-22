import { useState } from 'react';
import {
  IonButton, IonButtons, IonContent, IonDatetime, IonDatetimeButton, IonHeader, IonInput, IonItem,
  IonLabel, IonList, IonModal, IonSelect, IonSelectOption, IonTitle, IonToolbar, useIonAlert,
  useIonToast,
} from '@ionic/react';
import { useData } from '../context/DataContext';
import { DAYS, formatTime, toMinutes } from '../services/utils';
import { success } from '../services/native';

// Add / edit a timetable slot. Pass `slot` to edit, or `day` for a new one.
export default function SlotForm({ isOpen, slot, day, onClose }) {
  const { subjects, slots, addSlot, updateSlot, deleteSlot } = useData();
  const [form, setForm] = useState(null);
  const [presentToast] = useIonToast();
  const [presentAlert] = useIonAlert();

  const onWillPresent = () => {
    if (slot) return setForm({ ...slot });
    // Start the new class where the last one of that day ends.
    const sameDay = slots.filter((s) => s.day === day).sort((a, b) => toMinutes(b.end) - toMinutes(a.end));
    const start = sameDay[0]?.end ?? '09:00';
    const endMin = Math.min(toMinutes(start) + 60, 23 * 60 + 59);
    const end = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
    setForm({ subjectId: subjects[0]?.id ?? null, day, start, end, room: '' });
  };

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const toast = (message) => presentToast({ message, color: 'danger', duration: 2200, position: 'top' });
  // IonDatetime gives 'YYYY-MM-DDTHH:mm:ss' or 'HH:mm'.
  const pickTime = (value) => String(value).match(/(\d{2}:\d{2})/)?.[1];

  const save = async () => {
    if (!form.subjectId) return toast('Choose a subject');
    if (toMinutes(form.end) <= toMinutes(form.start)) return toast('End time must be after start time');
    const clash = slots.find(
      (s) => s.id !== form.id && s.day === form.day &&
        toMinutes(s.start) < toMinutes(form.end) && toMinutes(form.start) < toMinutes(s.end)
    );
    if (clash) {
      const name = subjects.find((s) => s.id === clash.subjectId)?.name;
      return toast(`Clashes with ${name} (${formatTime(clash.start)} – ${formatTime(clash.end)})`);
    }
    const s = { ...form, room: form.room.trim() };
    if (slot) await updateSlot(s);
    else await addSlot(s);
    success();
    onClose();
  };

  const remove = () =>
    presentAlert({
      header: 'Remove this class from the timetable?',
      message: 'Attendance already marked for it is kept.',
      buttons: ['Cancel', {
        text: 'Remove', role: 'destructive',
        handler: async () => { await deleteSlot(slot.id); onClose(); },
      }],
    });

  return (
    <IonModal isOpen={isOpen} onWillPresent={onWillPresent} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonButton onClick={onClose}>Cancel</IonButton></IonButtons>
          <IonTitle>{slot ? 'Edit class' : 'Add class'}</IonTitle>
          <IonButtons slot="end"><IonButton strong onClick={save}>Save</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {form && (
          <>
            <IonList inset>
              <IonItem>
                <IonSelect
                  label="Subject" interface="action-sheet" placeholder="Choose"
                  value={form.subjectId} onIonChange={(e) => set('subjectId', e.detail.value)}
                >
                  {subjects.map((s) => <IonSelectOption key={s.id} value={s.id}>{s.name}</IonSelectOption>)}
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonSelect
                  label="Day" interface="action-sheet"
                  value={form.day} onIonChange={(e) => set('day', e.detail.value)}
                >
                  {DAYS.map((d) => <IonSelectOption key={d.value} value={d.value}>{d.long}</IonSelectOption>)}
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonLabel>Starts</IonLabel>
                <IonDatetimeButton datetime="slot-start" slot="end" />
              </IonItem>
              <IonItem>
                <IonLabel>Ends</IonLabel>
                <IonDatetimeButton datetime="slot-end" slot="end" />
              </IonItem>
              <IonItem>
                <IonInput
                  label="Room (optional)" labelPlacement="stacked" placeholder="e.g. Room 204 / Lab 3"
                  maxlength={30} value={form.room} onIonInput={(e) => set('room', e.detail.value ?? '')}
                />
              </IonItem>
            </IonList>

            <IonModal keepContentsMounted>
              <IonDatetime
                id="slot-start" presentation="time" minuteValues="0,5,10,15,20,25,30,35,40,45,50,55"
                value={`2000-01-01T${form.start}:00`}
                onIonChange={(e) => pickTime(e.detail.value) && set('start', pickTime(e.detail.value))}
              />
            </IonModal>
            <IonModal keepContentsMounted>
              <IonDatetime
                id="slot-end" presentation="time" minuteValues="0,5,10,15,20,25,30,35,40,45,50,55"
                value={`2000-01-01T${form.end}:00`}
                onIonChange={(e) => pickTime(e.detail.value) && set('end', pickTime(e.detail.value))}
              />
            </IonModal>

            <div className="ion-padding">
              <IonButton expand="block" onClick={save}>{slot ? 'Save changes' : 'Add to timetable'}</IonButton>
              {slot && (
                <IonButton expand="block" fill="clear" color="danger" onClick={remove}>
                  Remove from timetable
                </IonButton>
              )}
            </div>
          </>
        )}
      </IonContent>
    </IonModal>
  );
}
