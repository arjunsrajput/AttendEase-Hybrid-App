import { useState } from 'react';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonModal,
  IonSegment, IonSegmentButton, IonTextarea, IonTitle, IonToolbar, useIonAlert, useIonToast,
} from '@ionic/react';
import { cameraOutline, closeCircle, documentAttachOutline } from 'ionicons/icons';
import { useData } from '../context/DataContext';
import { STATUS, longDate } from '../services/utils';
import { deletePhoto, loadPhoto, success, takePhoto } from '../services/native';

// Edit one attendance mark: status, note and an optional proof photo
// (e.g. a medical certificate). `target` is either an existing record or a
// draft { subjectId, date, slotId } for a class that hasn't been marked yet.
export default function RecordSheet({ target, onClose }) {
  const { subjects, records, mark, markExtra, updateRecord, deleteRecord } = useData();
  const [form, setForm] = useState(null);
  const [preview, setPreview] = useState(null);
  const [presentAlert] = useIonAlert();
  const [presentToast] = useIonToast();

  const existing = target?.id ? records.find((r) => r.id === target.id) : null;
  const subject = subjects.find((s) => s.id === target?.subjectId);

  const onWillPresent = () => {
    const r = existing ?? target;
    setForm({ status: r.status ?? 'present', note: r.note ?? '', photo: r.photo ?? null });
    setPreview(null);
    if (r.photo) loadPhoto(r.photo).then(setPreview).catch(() => setPreview(null));
  };

  const attach = async () => {
    try {
      const path = await takePhoto();
      if (!path) return;
      if (form.photo && form.photo !== existing?.photo) await deletePhoto(form.photo);
      setForm((f) => ({ ...f, photo: path }));
      setPreview(await loadPhoto(path));
    } catch (e) {
      presentToast({ message: `Could not attach photo: ${e.message}`, color: 'danger', duration: 2500 });
    }
  };

  const removePhoto = () => {
    setForm((f) => ({ ...f, photo: null }));
    setPreview(null);
  };

  const save = async () => {
    const patch = { status: form.status, note: form.note.trim(), photo: form.photo };
    if (existing) {
      if (existing.photo && existing.photo !== form.photo) await deletePhoto(existing.photo);
      await updateRecord(existing.id, patch);
    } else if (target.slotId) {
      await mark(target.subjectId, target.date, target.slotId, form.status, patch);
    } else {
      await markExtra(target.subjectId, target.date, form.status, patch);
    }
    success();
    onClose();
  };

  const remove = () =>
    presentAlert({
      header: 'Remove this mark?',
      message: 'The class will no longer count towards attendance.',
      buttons: ['Cancel', {
        text: 'Remove', role: 'destructive',
        handler: async () => { await deleteRecord(existing.id); onClose(); },
      }],
    });

  return (
    <IonModal
      isOpen={!!target} onWillPresent={onWillPresent} onDidDismiss={onClose}
      initialBreakpoint={0.85} breakpoints={[0, 0.85, 1]}
    >
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonButton onClick={onClose}>Cancel</IonButton></IonButtons>
          <IonTitle>{subject?.name ?? 'Attendance'}</IonTitle>
          <IonButtons slot="end"><IonButton strong onClick={save}>Save</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {form && target && (
          <>
            <p className="sheet-date">{longDate(target.date)}</p>
            <IonSegment value={form.status} onIonChange={(e) => setForm((f) => ({ ...f, status: e.detail.value }))}>
              {Object.entries(STATUS).map(([key, s]) => (
                <IonSegmentButton key={key} value={key} className={`status-seg ${key}`}>
                  <IonLabel>{s.label}</IonLabel>
                </IonSegmentButton>
              ))}
            </IonSegment>

            <IonList inset className="sheet-list">
              <IonItem>
                <IonTextarea
                  label="Note" labelPlacement="stacked" autoGrow maxlength={120}
                  placeholder={form.status === 'absent' ? 'e.g. Fever — medical leave' : 'e.g. Surprise test'}
                  value={form.note} onIonInput={(e) => setForm((f) => ({ ...f, note: e.detail.value ?? '' }))}
                />
              </IonItem>
            </IonList>

            <h3 className="section-label">Proof / certificate</h3>
            {preview ? (
              <div className="proof-preview">
                <img src={preview} alt="Attached proof" />
                <button type="button" className="proof-remove" onClick={removePhoto} aria-label="Remove photo">
                  <IonIcon icon={closeCircle} />
                </button>
              </div>
            ) : (
              <button type="button" className="proof-empty" onClick={attach}>
                <IonIcon icon={cameraOutline} />
                <span>Attach a photo (medical certificate, permission letter…)</span>
              </button>
            )}
            {preview && (
              <IonButton fill="clear" size="small" onClick={attach}>
                <IonIcon icon={documentAttachOutline} slot="start" /> Replace photo
              </IonButton>
            )}

            <IonButton expand="block" className="ion-margin-top" onClick={save}>Save</IonButton>
            {existing && (
              <IonButton expand="block" fill="clear" color="danger" onClick={remove}>Remove mark</IonButton>
            )}
          </>
        )}
      </IonContent>
    </IonModal>
  );
}
