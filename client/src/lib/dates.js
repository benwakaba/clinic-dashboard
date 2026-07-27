export function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // week starts Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function toDateInputValue(date) {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function toTimeInputValue(date) {
  const d = new Date(date);
  return d.toTimeString().slice(0, 5);
}

export function combineDateAndTime(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00`);
}

export const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8am - 6pm

export function formatHour(hour) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${period}`;
}

export function formatTimeRange(start, end) {
  const opts = { hour: 'numeric', minute: '2-digit' };
  return `${new Date(start).toLocaleTimeString([], opts)} - ${new Date(end).toLocaleTimeString([], opts)}`;
}

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
