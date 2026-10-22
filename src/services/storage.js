// Persistent key-value storage via Capacitor Preferences
// (Android SharedPreferences on the phone, localStorage in the browser).
// Each collection is stored as one JSON string under its own key.
import { Preferences } from '@capacitor/preferences';

export const KEYS = ['subjects', 'slots', 'records', 'settings'];

export const DEFAULT_SETTINGS = {
  studentName: '',
  defaultTarget: 75,
  reminderEnabled: true,
  reminderMinutes: 10,
  postClassPrompt: true,
  darkMode: false,
};

const EMPTY = { subjects: [], slots: [], records: [], settings: DEFAULT_SETTINGS };

export async function loadAll() {
  const entries = await Promise.all(
    KEYS.map(async (key) => {
      const { value } = await Preferences.get({ key });
      try {
        return [key, value ? JSON.parse(value) : EMPTY[key]];
      } catch {
        return [key, EMPTY[key]];
      }
    })
  );
  const data = Object.fromEntries(entries);
  data.settings = { ...DEFAULT_SETTINGS, ...data.settings };
  return data;
}

export function save(key, value) {
  return Preferences.set({ key, value: JSON.stringify(value) });
}

// Validates a backup file before it replaces the current data.
export function parseBackup(text) {
  const data = JSON.parse(text);
  if (data?.app !== 'AttendEase' || !Array.isArray(data.subjects) || !Array.isArray(data.records)) {
    throw new Error('This is not an AttendEase backup file');
  }
  return {
    subjects: data.subjects,
    slots: data.slots ?? [],
    records: data.records,
    settings: { ...DEFAULT_SETTINGS, ...data.settings },
  };
}

export function makeBackup(data) {
  return JSON.stringify(
    { app: 'AttendEase', version: 1, exportedAt: new Date().toISOString(), ...data },
    null,
    2
  );
}
