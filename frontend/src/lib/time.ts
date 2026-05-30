export const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
export const DAY_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function to12h(hour: number, minute: number) {
  const period = hour >= 12 ? "PM" : "AM";
  let h = hour % 12;
  if (h === 0) h = 12;
  const mm = minute.toString().padStart(2, "0");
  return { time: `${h}:${mm}`, period, h, mm };
}

export function displayTime(hour: number, minute: number) {
  const { time, period } = to12h(hour, minute);
  return `${time} ${period}`;
}

export function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Human readable repeat summary
export function repeatLabel(days: number[]) {
  if (!days || days.length === 0) return "One-time";
  if (days.length === 7) return "Every day";
  const sorted = [...days].sort((a, b) => a - b);
  const isWeekdays =
    sorted.length === 5 && sorted.every((d) => d >= 1 && d <= 5);
  if (isWeekdays) return "Weekdays";
  const isWeekend = sorted.length === 2 && sorted.includes(0) && sorted.includes(6);
  if (isWeekend) return "Weekends";
  return sorted.map((d) => DAY_FULL[d].slice(0, 3)).join(", ");
}

// Time until the next occurrence of hour:minute, given repeatDays
export function nextOccurrenceMs(
  hour: number,
  minute: number,
  repeatDays: number[],
  from = new Date(),
) {
  const candidate = new Date(from);
  candidate.setSeconds(0, 0);
  candidate.setHours(hour, minute, 0, 0);

  const repeats = repeatDays && repeatDays.length > 0;
  if (!repeats) {
    if (candidate.getTime() <= from.getTime()) {
      candidate.setDate(candidate.getDate() + 1);
    }
    return candidate.getTime() - from.getTime();
  }
  // find the next day (0..7 ahead) that matches
  for (let i = 0; i < 8; i++) {
    const c = new Date(from);
    c.setSeconds(0, 0);
    c.setHours(hour, minute, 0, 0);
    c.setDate(c.getDate() + i);
    if (repeatDays.includes(c.getDay()) && c.getTime() > from.getTime()) {
      return c.getTime() - from.getTime();
    }
  }
  return 24 * 60 * 60 * 1000;
}

export function humanCountdown(ms: number) {
  if (ms <= 0) return "now";
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 1) return "under a minute";
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}
