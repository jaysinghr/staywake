export type RepeatPreset = "once" | "everyday" | "weekdays" | "weekends" | "custom";

export const EVERYDAY = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS = [1, 2, 3, 4, 5];
export const WEEKENDS = [0, 6];

function sameSet(a: number[], b: number[]) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

export function presetOf(days: number[]): RepeatPreset {
  if (!days || days.length === 0) return "once";
  if (sameSet(days, EVERYDAY)) return "everyday";
  if (sameSet(days, WEEKDAYS)) return "weekdays";
  if (sameSet(days, WEEKENDS)) return "weekends";
  return "custom";
}

export function presetDays(preset: RepeatPreset, current: number[]): number[] {
  switch (preset) {
    case "once":
      return [];
    case "everyday":
      return [...EVERYDAY];
    case "weekdays":
      return [...WEEKDAYS];
    case "weekends":
      return [...WEEKENDS];
    case "custom":
      return current.length ? current : [1, 2, 3, 4, 5];
  }
}
