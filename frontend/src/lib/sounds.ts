export interface SoundOption {
  id: string;
  label: string;
  file: string; // bundled filename, used for notification sound
  pro: boolean;
}

// Bundled local alarm tones (royalty-free, Mixkit). Local assets so the alarm
// is loud and instant even with no network — a remote URL could fail to play.
const MODULES: Record<string, number> = {
  classic: require("../../assets/sounds/classic.mp3"),
  morning: require("../../assets/sounds/morning.mp3"),
  digital: require("../../assets/sounds/digital.mp3"),
  rooster: require("../../assets/sounds/rooster.mp3"),
  siren: require("../../assets/sounds/siren.mp3"),
  critical: require("../../assets/sounds/critical.mp3"),
};

export const SOUNDS: SoundOption[] = [
  { id: "classic", label: "Classic", file: "classic.mp3", pro: false },
  { id: "morning", label: "Morning", file: "morning.mp3", pro: false },
  { id: "digital", label: "Digital", file: "digital.mp3", pro: false },
  { id: "rooster", label: "Rooster", file: "rooster.mp3", pro: false },
  { id: "siren", label: "Siren", file: "siren.mp3", pro: true },
  { id: "critical", label: "Critical", file: "critical.mp3", pro: true },
];

export function soundById(id: string): SoundOption {
  return SOUNDS.find((s) => s.id === id) ?? SOUNDS[0];
}

export function soundModule(id: string): number {
  return MODULES[id] ?? MODULES.classic;
}

export function soundFile(id: string): string {
  return soundById(id).file;
}
