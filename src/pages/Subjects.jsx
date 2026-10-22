import { useState } from 'react';
import {
  IonButton, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar,
  useIonRouter,
} from '@ionic/react';
import { add, bookOutline, chevronForward, sparklesOutline } from 'ionicons/icons';
import { useData } from '../context/DataContext';
import ProgressRing from '../components/ProgressRing';
import SubjectForm from '../components/SubjectForm';
import { adviceText, statusOf, subjectStats } from '../services/attendance';

export default function Subjects() {
  const { subjects, records, loadSample } = useData();
  const router = useIonRouter();
  const [formOpen, setFormOpen] = useState(false);

  // Subjects that need attention first.
  const rows = subjects
    .map((s) => ({ subject: s, stats: subjectStats(s, records) }))
    .sort((a, b) => (a.stats.percent ?? 101) - (b.stats.percent ?? 101));

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar><IonTitle>Subjects</IonTitle></IonToolbar>
      </IonHeader>
      <IonContent>
        {subjects.length === 0 ? (
          <div className="empty-state">
            <IonIcon icon={bookOutline} />
            <p>No subjects yet. Tap <strong>+</strong> to add your first subject.</p>
            <IonButton fill="outline" size="small" onClick={loadSample}>
              <IonIcon icon={sparklesOutline} slot="start" /> Load sample data
            </IonButton>
          </div>
        ) : (
          <div className="subject-list">
            {rows.map(({ subject, stats }) => (
              <button
                key={subject.id} type="button"
                className={`subject-card ${statusOf(stats.percent, subject.target)}`}
                style={{ '--subject-color': subject.color }}
                onClick={() => router.push(`/subjects/${subject.id}`)}
              >
                <ProgressRing percent={stats.percent} target={subject.target} size={62} />
                <div className="subject-info">
                  <strong>{subject.name}</strong>
                  <span className="subject-meta">
                    {stats.attended}/{stats.total} classes · target {subject.target}%
                  </span>
                  <span className="advice">{adviceText(stats)}</span>
                </div>
                <IonIcon icon={chevronForward} className="chevron" />
              </button>
            ))}
          </div>
        )}
        <div className="bottom-spacer" />
        <IonFab slot="fixed" vertical="bottom" horizontal="end">
          <IonFabButton onClick={() => setFormOpen(true)} aria-label="Add subject">
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
        <SubjectForm isOpen={formOpen} subject={null} onClose={() => setFormOpen(false)} />
      </IonContent>
    </IonPage>
  );
}
