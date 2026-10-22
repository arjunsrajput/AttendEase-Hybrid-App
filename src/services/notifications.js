// Class reminders and the post-class "Did you attend?" prompt.
// Both repeat weekly using a cron-like `on: { weekday, hour, minute }` schedule.
import { LocalNotifications } from '@capacitor/local-notifications';
import { isNative } from './native';
import { formatTime, sortSlots, toMinutes } from './utils';

export const ACTION_TYPE = 'ATTENDANCE_PROMPT';

export async function registerActions() {
  if (!isNative) return;
  await LocalNotifications.registerActionTypes({
    types: [{
      id: ACTION_TYPE,
      actions: [
        { id: 'present', title: '✅ Present' },
        { id: 'absent', title: '❌ Absent' },
        { id: 'cancelled', title: 'Cancelled' },
      ],
    }],
  });
}

export async function ensurePermission() {
  if (!isNative) return false;
  let { display } = await LocalNotifications.checkPermissions();
  if (display !== 'granted') ({ display } = await LocalNotifications.requestPermissions());
  return display === 'granted';
}

// Splits minutes-since-midnight into a weekly schedule, moving to the
// previous day if a reminder before an early class crosses midnight.
function weeklyAt(day, minutes) {
  let d = day;
  let m = minutes;
  if (m < 0) {
    m += 24 * 60;
    d = (d + 6) % 7;
  }
  // Capacitor's Weekday is 1 = Sunday … 7 = Saturday; JS getDay() is 0 … 6.
  return { on: { weekday: d + 1, hour: Math.floor(m / 60), minute: m % 60 }, allowWhileIdle: true };
}

// Cancels everything and schedules fresh notifications from the timetable.
export async function rescheduleAll({ slots, subjects, settings }) {
  if (!isNative) return;
  const { notifications: pending } = await LocalNotifications.getPending();
  if (pending.length) {
    await LocalNotifications.cancel({ notifications: pending.map((n) => ({ id: n.id })) });
  }
  if (!settings.reminderEnabled && !settings.postClassPrompt) return;
  if (!slots.length || !(await ensurePermission())) return;

  const byId = Object.fromEntries(subjects.map((s) => [s.id, s]));
  const notifications = [];

  sortSlots(slots).forEach((slot, i) => {
    const subject = byId[slot.subjectId];
    if (!subject) return;
    const room = slot.room ? ` · ${slot.room}` : '';

    if (settings.reminderEnabled) {
      notifications.push({
        id: 1000 + i * 2,
        title: `${subject.name} in ${settings.reminderMinutes} min`,
        body: `${formatTime(slot.start)} – ${formatTime(slot.end)}${room}`,
        schedule: weeklyAt(slot.day, toMinutes(slot.start) - settings.reminderMinutes),
        smallIcon: 'ic_stat_notify',
        extra: { kind: 'reminder', slotId: slot.id },
      });
    }
    if (settings.postClassPrompt) {
      notifications.push({
        id: 1000 + i * 2 + 1,
        title: `Did you attend ${subject.name}?`,
        body: 'Mark your attendance right from here.',
        schedule: weeklyAt(slot.day, toMinutes(slot.end)),
        actionTypeId: ACTION_TYPE,
        smallIcon: 'ic_stat_notify',
        extra: { kind: 'prompt', slotId: slot.id, subjectId: subject.id },
      });
    }
  });

  if (notifications.length) await LocalNotifications.schedule({ notifications });
}

// Calls onMark(slotId, subjectId, status) when a prompt action button is tapped.
export function listenForActions(onMark) {
  if (!isNative) return () => {};
  const handle = LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
    const extra = event.notification?.extra;
    if (extra?.kind === 'prompt' && ['present', 'absent', 'cancelled'].includes(event.actionId)) {
      onMark(extra.slotId, extra.subjectId, event.actionId);
    }
  });
  return () => handle.then((h) => h.remove());
}
