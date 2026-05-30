import { Difficulty } from "../types";

export interface MathChallenge {
  prompt: string;
  answer: string;
}

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function genMath(difficulty: Difficulty): MathChallenge {
  if (difficulty === "easy") {
    const a = rnd(2, 9);
    const b = rnd(2, 9);
    return { prompt: `${a} + ${b}`, answer: String(a + b) };
  }
  if (difficulty === "medium") {
    const a = rnd(6, 14);
    const b = rnd(3, 9);
    const op = Math.random() > 0.5 ? "+" : "×";
    if (op === "+") return { prompt: `${a + 10} + ${b * 2}`, answer: String(a + 10 + b * 2) };
    return { prompt: `${a} × ${b}`, answer: String(a * b) };
  }
  // hard
  const a = rnd(11, 19);
  const b = rnd(11, 19);
  return { prompt: `${a} × ${b}`, answer: String(a * b) };
}

// Quick mini-math for check-ins (always fast)
export function genMiniMath(): MathChallenge {
  const a = rnd(2, 9);
  const b = rnd(2, 9);
  return { prompt: `${a} + ${b}`, answer: String(a + b) };
}

const PHRASES = [
  "I AM AWAKE AND READY",
  "TODAY IS MY DAY",
  "NO GOING BACK TO BED",
  "RISE AND OWN THE DAY",
  "STAY UP STAY STRONG",
  "MORNINGS ARE MINE",
  "DISCIPLINE OVER SNOOZE",
  "WAKE UP STAY UP",
];

export function genPhrase(difficulty: Difficulty): string {
  if (difficulty === "easy") {
    const short = PHRASES.filter((p) => p.length <= 16);
    return short[rnd(0, short.length - 1)];
  }
  return PHRASES[rnd(0, PHRASES.length - 1)];
}

export function shakeTarget(difficulty: Difficulty): number {
  if (difficulty === "easy") return 15;
  if (difficulty === "medium") return 25;
  return 40;
}

export function resolveMissionType(
  type: "math" | "typing" | "shake" | "random",
): "math" | "typing" | "shake" {
  if (type !== "random") return type;
  const pool: ("math" | "typing" | "shake")[] = ["math", "typing", "shake"];
  return pool[rnd(0, pool.length - 1)];
}
