import { useState } from 'react';
import {
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonHeader, IonIcon,
  IonPage, IonTitle, IonToolbar, useIonToast,
} from '@ionic/react';
import { barChartOutline, documentTextOutline, gridOutline } from 'ionicons/icons';
import {
  BarController, BarElement, CategoryScale, Chart as ChartJS, Legend, LineController, LineElement,
  LinearScale, PointElement, Tooltip,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { useData } from '../context/DataContext';
import { formatPercent, overallStats, subjectStats } from '../services/attendance';
import { exportCsv, exportPdf } from '../services/reports';
import { fromDateKey, shiftDate, toDateKey } from '../services/utils';

// The generic <Chart> needs its controllers registered explicitly (tree-shaken otherwise).
ChartJS.register(
  BarController, BarElement, LineController, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend
);

const shortName = (name) => (name.length > 12 ? name.split(' ').map((w) => w[0]).join('').toUpperCase() : name);

export default function Reports() {
  const { subjects, records, settings } = useData();
  const [presentToast] = useIonToast();
  const [busy, setBusy] = useState(null);

  const stats = subjects.map((s) => ({ subject: s, ...subjectStats(s, records) }));
  const overall = overallStats(subjects, records);
  const marked = records.filter((r) => r.status !== 'cancelled');
  const textColor = settings.darkMode ? '#d4d4d8' : '#52525b';
  const gridColor = settings.darkMode ? '#3f3f46' : '#e4e4e7';

  // Attendance % per week for the last 8 weeks (all subjects together).
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = shiftDate(toDateKey(), -7 * (7 - i));
    const start = shiftDate(end, -6);
    const inWeek = marked.filter((r) => r.date >= start && r.date <= end);
    const present = inWeek.filter((r) => r.status === 'present').length;
    return {
      label: fromDateKey(start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      percent: inWeek.length ? (present / inWeek.length) * 100 : null,
    };
  });

  const barData = {
    labels: stats.map((s) => shortName(s.subject.name)),
    datasets: [
      {
        type: 'line',
        label: 'Target',
        data: stats.map((s) => s.target),
        borderColor: settings.darkMode ? '#fbbf24' : '#d97706',
        borderDash: [6, 4],
        borderWidth: 2,
        pointRadius: 0,
      },
      {
        type: 'bar',
        label: 'Attendance %',
        data: stats.map((s) => (s.percent === null ? 0 : Math.round(s.percent * 10) / 10)),
        backgroundColor: stats.map((s) => s.subject.color),
        borderRadius: 8,
      },
    ],
  };

  const lineData = {
    labels: weeks.map((w) => w.label),
    datasets: [{
      type: 'line',
      label: 'Weekly attendance %',
      data: weeks.map((w) => (w.percent === null ? null : Math.round(w.percent))),
      borderColor: '#0d9488',
      backgroundColor: '#0d9488',
      tension: 0.35,
      spanGaps: true,
    }],
  };

  const axes = {
    x: { ticks: { color: textColor }, grid: { display: false } },
    y: { min: 0, max: 100, ticks: { color: textColor, callback: (v) => `${v}%` }, grid: { color: gridColor } },
  };

  const run = async (kind) => {
    if (!subjects.length) return presentToast({ message: 'Add subjects first', duration: 1800, position: 'top' });
    setBusy(kind);
    try {
      if (kind === 'pdf') await exportPdf({ subjects, records, studentName: settings.studentName.trim() });
      else await exportCsv({ subjects, records });
    } catch (e) {
      presentToast({ message: `Export failed: ${e.message}`, color: 'danger', duration: 2500, position: 'top' });
    } finally {
      setBusy(null);
    }
  };

  const best = [...stats].filter((s) => s.percent !== null).sort((a, b) => b.percent - a.percent);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar><IonTitle>Reports</IonTitle></IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="summary-tiles">
          <div><strong>{formatPercent(overall.percent)}</strong><small>Overall</small></div>
          <div><strong>{overall.attended}/{overall.total}</strong><small>Classes</small></div>
          <div><strong>{stats.filter((s) => s.percent !== null && s.percent < s.target).length}</strong><small>Below target</small></div>
        </div>

        {stats.length === 0 || overall.total === 0 ? (
          <div className="empty-state">
            <IonIcon icon={barChartOutline} />
            <p>Charts appear once you start marking attendance.</p>
          </div>
        ) : (
          <>
            <IonCard>
              <IonCardHeader><IonCardTitle>By subject</IonCardTitle></IonCardHeader>
              <IonCardContent>
                <div className="chart-box">
                  <Chart
                    type="bar" data={barData}
                    options={{
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { labels: { color: textColor } },
                        tooltip: { callbacks: { title: (items) => stats[items[0].dataIndex].subject.name } },
                      },
                      scales: axes,
                    }}
                  />
                </div>
                {best.length > 1 && (
                  <p className="chart-caption">
                    Best: <strong>{best[0].subject.name}</strong> ({formatPercent(best[0].percent)}) ·
                    Needs work: <strong>{best.at(-1).subject.name}</strong> ({formatPercent(best.at(-1).percent)})
                  </p>
                )}
              </IonCardContent>
            </IonCard>

            <IonCard>
              <IonCardHeader><IonCardTitle>Last 8 weeks</IonCardTitle></IonCardHeader>
              <IonCardContent>
                <div className="chart-box small">
                  <Chart
                    type="line" data={lineData}
                    options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: axes }}
                  />
                </div>
              </IonCardContent>
            </IonCard>
          </>
        )}

        <IonCard>
          <IonCardHeader><IonCardTitle>Export report</IonCardTitle></IonCardHeader>
          <IonCardContent>
            <p className="export-hint">Share your attendance with parents, mentors or yourself — includes a per-subject summary and the full history.</p>
            <div className="export-buttons">
              <IonButton onClick={() => run('pdf')} disabled={!!busy}>
                <IonIcon icon={documentTextOutline} slot="start" /> {busy === 'pdf' ? 'Creating…' : 'PDF'}
              </IonButton>
              <IonButton fill="outline" onClick={() => run('csv')} disabled={!!busy}>
                <IonIcon icon={gridOutline} slot="start" /> {busy === 'csv' ? 'Creating…' : 'CSV'}
              </IonButton>
            </div>
          </IonCardContent>
        </IonCard>
        <div className="bottom-spacer" />
      </IonContent>
    </IonPage>
  );
}
