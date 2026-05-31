export interface SoundOption {
  id: string;
  label: string;
  uri: string;
  pro: boolean;
}

// Royalty-free alarm tones from Google's open sound library.
export const SOUNDS: SoundOption[] = [
  {
    id: "classic",
    label: "Classic Bell",
    uri: "https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg",
    pro: false,
  },
  {
    id: "digital",
    label: "Digital",
    uri: "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg",
    pro: false,
  },
  {
    id: "bell",
    label: "Bell Ring",
    uri: "https://actions.google.com/sounds/v1/alarms/medium_bell_ringing_near.ogg",
    pro: false,
  },
  {
    id: "mechanical",
    label: "Mechanical",
    uri: "https://actions.google.com/sounds/v1/alarms/mechanical_clock_ring.ogg",
    pro: true,
  },
  {
    id: "winding",
    label: "Winding Clock",
    uri: "https://actions.google.com/sounds/v1/alarms/winding_alarm_clock.ogg",
    pro: true,
  },
  {
    id: "bugle",
    label: "Bugle Charge",
    uri: "https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg",
    pro: true,
  },
];

export function soundById(id: string): SoundOption {
  return SOUNDS.find((s) => s.id === id) ?? SOUNDS[0];
}
