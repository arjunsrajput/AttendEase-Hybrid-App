import { useState } from 'react';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonInput, IonItem, IonList, IonListHeader,
  IonLabel, IonModal, IonNote, IonRange, IonTitle, IonToolbar, useIonToast,
} from '@ionic/react';
import { useData } from '../context/DataContext';
import { SUBJECT_COLORS } from '../services/utils';
import { success } from '../services/native';

const blank = (target) => ({
  name: '', teacher: '', color: SUBJECT_COLORS[0], target, initialAttended: 0, initialTotal: 0,
});

// Add / edit subject sheet. Pass `subject` to edit, or null to add.
export default function SubjectForm({ isOpen, subject, onClose }) {
  const { settings, subjects, addSubject, updateSubject } = useData();
  const [form, setForm] = useState(blank(75));
  const [presentToast] = useIonToast();

  const onWillPresent = () => {
    if (subject) return setForm({ ...subject });
    // Pick the next colour that isn't used yet.
    const used = new Set(subjects.map((s) => s.color));
    const color = SUBJECT_COLORS.find((c) => !used.has(c)) ?? SUBJECT_COLORS[0];
    setForm({ ...blank(settings.defaultTarget), color });
  };

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const toast = (message) => presentToast({ message, color: 'danger', duration: 2000, position: 'top' });

  const save = async () => {
    const name = form.name.trim();
    const attended = Math.max(0, parseInt(form.initialAttended, 10) || 0);
    const total = Math.max(0, parseInt(form.initialTotal, 10) || 0);
    if (!name) return toast('Enter the subject name');
    if (attended > total) return toast('Attended classes cannot be more than total classes');

    const s = { ...form, name, teacher: form.teacher.trim(), initialAttended: attended, initialTotal: total };
    if (subject) await updateSubject(s);
    else await addSubject(s);
    success();
    onClose();
  };

  return (
    <IonModal isOpen={isOpen} onWillPresent={onWillPresent} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonButton onClick={onClose}>Cancel</IonButton></IonButtons>
          <IonTitle>{subject ? 'Edit subject' : 'New subject'}</IonTitle>
          <IonButtons slot="end"><IonButton strong onClick={save}>Save</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList inset>
          <IonItem>
            <IonInput
              label="Subject name" labelPlacement="stacked" placeholder="e.g. Operating Systems"
              maxlength={40} value={form.name} onIonInput={(e) => set('name', e.detail.value ?? '')}
            />
          </IonItem>
          <IonItem>
            <IonInput
              label="Teacher (optional)" labelPlacement="stacked" placeholder="e.g. Dr. Sharma"
              maxlength={40} value={form.teacher} onIonInput={(e) => set('teacher', e.detail.value ?? '')}
            />
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader><IonLabel>Colour</IonLabel></IonListHeader>
          <div className="color-grid">
            {SUBJECT_COLORS.map((color) => (
              <button
                key={color} type="button" aria-label={color}
                className={`color-option ${form.color === color ? 'selected' : ''}`}
                style={{ background: color }}
                onClick={() => set('color', color)}
              />
            ))}
          </div>
        </IonList>

        <IonList inset>
          <IonListHeader>
            <IonLabel>Required attendance</IonLabel>
            <IonNote className="target-value">{form.target}%</IonNote>
          </IonListHeader>
          <IonItem lines="none">
            <IonRange
              min={50} max={100} step={5} snaps ticks pin aria-label="Target percentage"
              value={form.target} onIonInput={(e) => set('target', e.detail.value)}
            />
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader><IonLabel>Already attended before using the app?</IonLabel></IonListHeader>
          <IonItem>
            <IonInput
              label="Classes attended" labelPlacement="fixed" type="number" inputmode="numeric" min="0"
              value={form.initialAttended} onIonInput={(e) => set('initialAttended', e.detail.value)}
            />
          </IonItem>
          <IonItem>
            <IonInput
              label="Classes held" labelPlacement="fixed" type="number" inputmode="numeric" min="0"
              value={form.initialTotal} onIonInput={(e) => set('initialTotal', e.detail.value)}
            />
          </IonItem>
        </IonList>
        <p className="form-hint">Leave these at 0 if you're starting from the first class of the semester.</p>

        <div className="ion-padding">
          <IonButton expand="block" onClick={save}>{subject ? 'Save changes' : 'Add subject'}</IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
}
