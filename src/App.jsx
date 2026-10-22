import { useEffect } from 'react';
import { Navigate, Route } from 'react-router-dom';
import {
  IonApp, IonIcon, IonLabel, IonRouterOutlet, IonSpinner, IonTabBar, IonTabButton, IonTabs,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { barChart, book, calendar, settings as settingsIcon, today } from 'ionicons/icons';

import { DataProvider, useData } from './context/DataContext';
import ErrorBoundary from './components/ErrorBoundary';
import { hideSplash } from './services/native';
import Today from './pages/Today';
import Subjects from './pages/Subjects';
import SubjectDetail from './pages/SubjectDetail';
import Timetable from './pages/Timetable';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

setupIonicReact();

function Tabs() {
  return (
    <IonReactRouter>
      <IonTabs>
        <IonRouterOutlet>
          <Route path="/today" element={<Today />} />
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/subjects/:id" element={<SubjectDetail />} />
          <Route path="/timetable" element={<Timetable />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </IonRouterOutlet>
        <IonTabBar slot="bottom">
          <IonTabButton tab="today" href="/today">
            <IonIcon icon={today} />
            <IonLabel>Today</IonLabel>
          </IonTabButton>
          <IonTabButton tab="subjects" href="/subjects">
            <IonIcon icon={book} />
            <IonLabel>Subjects</IonLabel>
          </IonTabButton>
          <IonTabButton tab="timetable" href="/timetable">
            <IonIcon icon={calendar} />
            <IonLabel>Timetable</IonLabel>
          </IonTabButton>
          <IonTabButton tab="reports" href="/reports">
            <IonIcon icon={barChart} />
            <IonLabel>Reports</IonLabel>
          </IonTabButton>
          <IonTabButton tab="settings" href="/settings">
            <IonIcon icon={settingsIcon} />
            <IonLabel>Settings</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>
    </IonReactRouter>
  );
}

function Shell() {
  const { ready, error } = useData();

  useEffect(() => {
    if (ready || error) hideSplash();
  }, [ready, error]);

  if (error) {
    return (
      <div className="boot-screen">
        <h2>Could not load your data</h2>
        <p>{error}</p>
      </div>
    );
  }
  if (!ready) {
    return <div className="boot-screen"><IonSpinner name="crescent" /></div>;
  }
  return <Tabs />;
}

export default function App() {
  return (
    <IonApp>
      <ErrorBoundary>
        <DataProvider>
          <Shell />
        </DataProvider>
      </ErrorBoundary>
    </IonApp>
  );
}
