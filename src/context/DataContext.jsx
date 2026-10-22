import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadAll, save } from '../services/storage';
import { listenForActions, registerActions, rescheduleAll } from '../services/notifications';
import { applySystemTheme, deletePhoto } from '../services/native';
import { buildSampleData } from '../services/sample';
import { fromDateKey, shiftDate, toDateKey, uid } from '../services/utils';

const DataContext = createContext(null);

// Most recent date (today or earlier) that falls on the given weekday.
function lastDateForDay(day) {
  const today = toDateKey();
  const diff = (fromDateKey(today).getDay() - day + 7) % 7;
  return shiftDate(today, -diff);
}

export function DataProvider({ children }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  // Always holds the latest data, so async callbacks never write stale state.
  const latest = useRef(null);

  useEffect(() => {
    loadAll()
      .then((d) => {
        latest.current = d;
        setData(d);
      })
      .catch((e) => setError(e.message || String(e)));
  }, []);

  // Applies changes to one or more collections and persists them.
  const commit = useCallback(async (changes) => {
    const next = { ...latest.current, ...changes };
    latest.current = next;
    setData(next);
    await Promise.all(Object.keys(changes).map((key) => save(key, next[key])));
  }, []);

  const actions = useMemo(() => {
    const get = () => latest.current;

    const mark = (subjectId, date, slotId, status, extra = {}) => {
      const { records } = get();
      const existing = slotId && records.find((r) => r.slotId === slotId && r.date === date);
      if (existing) {
        return commit({
          records: records.map((r) => (r.id === existing.id ? { ...r, status, ...extra } : r)),
        });
      }
      return commit({
        records: [...records, { id: uid(), subjectId, slotId, date, status, note: '', ...extra }],
      });
    };

    return {
      addSubject: (s) => commit({ subjects: [...get().subjects, { ...s, id: uid() }] }),
      updateSubject: (s) => commit({ subjects: get().subjects.map((x) => (x.id === s.id ? s : x)) }),
      deleteSubject: async (id) => {
        const { subjects, slots, records } = get();
        records.filter((r) => r.subjectId === id && r.photo).forEach((r) => deletePhoto(r.photo));
        await commit({
          subjects: subjects.filter((s) => s.id !== id),
          slots: slots.filter((s) => s.subjectId !== id),
          records: records.filter((r) => r.subjectId !== id),
        });
      },

      addSlot: (s) => commit({ slots: [...get().slots, { ...s, id: uid() }] }),
      updateSlot: (s) => commit({ slots: get().slots.map((x) => (x.id === s.id ? s : x)) }),
      deleteSlot: (id) => commit({ slots: get().slots.filter((s) => s.id !== id) }),

      mark,
      markExtra: (subjectId, date, status, fields = {}) =>
        mark(subjectId, date, null, status, { extra: true, ...fields }),
      updateRecord: (id, patch) =>
        commit({ records: get().records.map((r) => (r.id === id ? { ...r, ...patch } : r)) }),
      deleteRecord: async (id) => {
        const record = get().records.find((r) => r.id === id);
        if (record?.photo) await deletePhoto(record.photo);
        await commit({ records: get().records.filter((r) => r.id !== id) });
      },

      updateSettings: (patch) => commit({ settings: { ...get().settings, ...patch } }),

      resetSemester: async () => {
        get().records.filter((r) => r.photo).forEach((r) => deletePhoto(r.photo));
        await commit({
          records: [],
          subjects: get().subjects.map((s) => ({ ...s, initialAttended: 0, initialTotal: 0 })),
        });
      },
      restore: (backup) => commit(backup),
      loadSample: () => commit(buildSampleData(get().settings.defaultTarget)),
    };
  }, [commit]);

  const ready = data !== null;
  const darkMode = data?.settings.darkMode ?? false;

  useEffect(() => {
    document.documentElement.classList.toggle('ion-palette-dark', darkMode);
    applySystemTheme(darkMode);
  }, [darkMode]);

  // Keep the scheduled notifications in sync with the timetable.
  useEffect(() => {
    if (!ready) return;
    rescheduleAll(latest.current).catch((e) => console.warn('Scheduling failed', e));
  }, [ready, data?.slots, data?.subjects, data?.settings]);

  // "Present / Absent / Cancelled" buttons on the post-class notification.
  useEffect(() => {
    if (!ready) return;
    registerActions().catch(() => {});
    return listenForActions((slotId, subjectId, status) => {
      const slot = latest.current.slots.find((s) => s.id === slotId);
      if (!slot) return;
      actions.mark(subjectId, lastDateForDay(slot.day), slotId, status);
    });
  }, [ready, actions]);

  const value = useMemo(() => ({ ready, error, ...(data ?? {}), ...actions }), [ready, error, data, actions]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}
