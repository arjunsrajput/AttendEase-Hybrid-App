import { useRef } from 'react';
import {
  IonContent, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonListHeader, IonNote,
  IonPage, IonSelect, IonSelectOption, IonTitle, IonToggle, IonToolbar, useIonAlert, useIonToast,
} from '@ionic/react';
import {
  alarmOutline, chatbubbleEllipsesOutline, cloudDownloadOutline, cloudUploadOutline,
  flagOutline, informationCircleOutline, moonOutline, personOutline, refreshOutline,
  sparklesOutline, trashOutline,
} from 'ionicons/icons';
import { useData } from '../context/DataContext';
import { makeBackup, parseBackup } from '../services/storage';
import { ensurePermission } from '../services/notifications';
import { isNative, shareFile, success, tap } from '../services/native';
import { toDateKey } from '../services/utils';

export default function Settings() {
  const data = useData();
  const { settings, updateSettings, subjects, slots, records } = data;
  const [presentAlert] = useIonAlert();
  const [presentToast] = useIonToast();
  const fileInput = useRef(null);

  const toast = (message, color = 'dark') => presentToast({ message, color, duration: 2200, position: 'top' });

  const toggleNotifications = async (patch) => {
    const turningOn = Object.values(patch).some((v) => v === true);
    if (turningOn) {
      if (!isNative) toast('Notifications work in the Android app', 'warning');
      else if (!(await ensurePermission())) return toast('Allow notifications in Android settings', 'danger');
    }
    await updateSettings(patch);
  };

  const backup = async () => {
    try {
      await shareFile({
        fileName: `attendease_backup_${toDateKey()}.json`,
        content: makeBackup({ subjects, slots, records, settings }),
        mimeType: 'application/json',
        title: 'AttendEase backup',
      });
    } catch (e) {
      toast(`Backup failed: ${e.message}`, 'danger');
    }
  };

  const onRestoreFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const restored = parseBackup(await file.text());
      presentAlert({
        header: 'Restore backup?',
        message: `This replaces your current data with ${restored.subjects.length} subjects and ${restored.records.length} attendance records from the backup.`,
        buttons: ['Cancel', {
          text: 'Restore',
          handler: async () => { await data.restore(restored); success(); toast('Backup restored', 'success'); },
        }],
      });
    } catch (err) {
      toast(err.message || 'Could not read that file', 'danger');
    }
  };

  const confirm = (header, message, text, action, done) =>
    presentAlert({
      header, message,
      buttons: ['Cancel', {
        text, role: 'destructive',
        handler: async () => { await action(); toast(done); },
      }],
    });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar><IonTitle>Settings</IonTitle></IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList inset>
          <IonListHeader><IonLabel>Profile</IonLabel></IonListHeader>
          <IonItem>
            <IonIcon icon={personOutline} slot="start" />
            <IonInput
              label="Your name" labelPlacement="stacked" placeholder="Shown on reports"
              maxlength={40} value={settings.studentName} debounce={400}
              onIonInput={(e) => updateSettings({ studentName: e.detail.value ?? '' })}
            />
          </IonItem>
          <IonItem>
            <IonIcon icon={flagOutline} slot="start" />
            <IonSelect
              label="Default target" interface="action-sheet" value={settings.defaultTarget}
              onIonChange={(e) => updateSettings({ defaultTarget: e.detail.value })}
            >
              {[60, 65, 70, 75, 80, 85, 90].map((v) => <IonSelectOption key={v} value={v}>{v}%</IonSelectOption>)}
            </IonSelect>
          </IonItem>
        </IonList>
        <p className="form-hint">The default target is used for new subjects. Each subject can have its own.</p>

        <IonList inset>
          <IonListHeader><IonLabel>Notifications</IonLabel></IonListHeader>
          <IonItem>
            <IonIcon icon={alarmOutline} slot="start" />
            <IonToggle checked={settings.reminderEnabled} onIonChange={(e) => toggleNotifications({ reminderEnabled: e.detail.checked })}>
              Remind me before class
            </IonToggle>
          </IonItem>
          {settings.reminderEnabled && (
            <IonItem>
              <IonSelect
                label="How early" interface="action-sheet" value={settings.reminderMinutes}
                onIonChange={(e) => updateSettings({ reminderMinutes: e.detail.value })}
              >
                {[5, 10, 15, 30].map((v) => <IonSelectOption key={v} value={v}>{v} minutes before</IonSelectOption>)}
              </IonSelect>
            </IonItem>
          )}
          <IonItem>
            <IonIcon icon={chatbubbleEllipsesOutline} slot="start" />
            <IonToggle checked={settings.postClassPrompt} onIonChange={(e) => toggleNotifications({ postClassPrompt: e.detail.checked })}>
              <IonLabel>
                Ask after each class
                <p>Mark Present / Absent from the notification</p>
              </IonLabel>
            </IonToggle>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader><IonLabel>Appearance</IonLabel></IonListHeader>
          <IonItem>
            <IonIcon icon={moonOutline} slot="start" />
            <IonToggle checked={settings.darkMode} onIonChange={(e) => { tap(); updateSettings({ darkMode: e.detail.checked }); }}>
              Dark mode
            </IonToggle>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader><IonLabel>Data</IonLabel></IonListHeader>
          <IonItem button onClick={backup}>
            <IonIcon icon={cloudUploadOutline} slot="start" />
            <IonLabel>Back up<p>Save everything to a file (Drive, WhatsApp, email…)</p></IonLabel>
          </IonItem>
          <IonItem button onClick={() => fileInput.current?.click()}>
            <IonIcon icon={cloudDownloadOutline} slot="start" />
            <IonLabel>Restore from backup<p>Pick a .json backup file</p></IonLabel>
          </IonItem>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={onRestoreFile} />
          <IonItem
            button
            onClick={() => confirm(
              'Load sample data?', 'Your current subjects, timetable and attendance will be replaced with a demo semester.',
              'Load sample', data.loadSample, 'Sample data loaded'
            )}
          >
            <IonIcon icon={sparklesOutline} slot="start" />
            <IonLabel>Load sample data<p>A demo semester to explore the app</p></IonLabel>
          </IonItem>
          <IonItem
            button
            onClick={() => confirm(
              'Start a new semester?', 'All attendance marks are cleared. Subjects and timetable are kept.',
              'Reset', data.resetSemester, 'Attendance cleared for the new semester'
            )}
          >
            <IonIcon icon={refreshOutline} slot="start" color="warning" />
            <IonLabel>New semester<p>Clear attendance, keep subjects &amp; timetable</p></IonLabel>
          </IonItem>
          <IonItem
            button
            onClick={() => confirm(
              'Delete everything?', 'Subjects, timetable and attendance will be permanently deleted.',
              'Delete all', () => data.restore({ subjects: [], slots: [], records: [] }), 'All data deleted'
            )}
          >
            <IonIcon icon={trashOutline} slot="start" color="danger" />
            <IonLabel color="danger">Delete all data</IonLabel>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonItem lines="none">
            <IonIcon icon={informationCircleOutline} slot="start" />
            <IonLabel>
              AttendEase v1.0
              <p>Hybrid app · React + Ionic + Capacitor · works fully offline</p>
            </IonLabel>
            <IonNote slot="end">{subjects.length} subjects</IonNote>
          </IonItem>
        </IonList>
        <div className="bottom-spacer" />
      </IonContent>
    </IonPage>
  );
}
