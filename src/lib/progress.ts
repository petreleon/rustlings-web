import { exercises, exerciseById, upstream, type Exercise } from "./exercises";

export const STORAGE_KEY = "rustlings-web:progress:v1";
export const MAX_IMPORT_BYTES = 2_000_000;
export type Progress = {
  version: 1;
  corpus: string;
  selected: string;
  drafts: Record<string, string>;
  completed: Record<string, { source: string; at: string }>;
};
export const emptyProgress = (): Progress => ({
  version: 1, corpus: upstream.commit, selected: exercises[0].id, drafts: {}, completed: {},
});
export const sourceFor = (progress: Progress, exercise: Exercise) => progress.drafts[exercise.id] ?? exercise.source;
export const isComplete = (progress: Progress, exercise: Exercise) =>
  !exercise.limitation && progress.completed[exercise.id]?.source === sourceFor(progress, exercise);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function parseProgress(text: string): Progress {
  if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) throw new Error("Progress file exceeds 2 MB.");
  const value: unknown = JSON.parse(text);
  if (!isRecord(value) || value.version !== 1 || value.corpus !== upstream.commit ||
      typeof value.selected !== "string" || !exerciseById.has(value.selected) ||
      !isRecord(value.drafts) || !isRecord(value.completed)) {
    throw new Error("This progress file is invalid or belongs to a different Rustlings release.");
  }
  const progress = emptyProgress();
  progress.selected = value.selected;
  for (const [id, source] of Object.entries(value.drafts)) {
    if (!exerciseById.has(id) || typeof source !== "string" || source.length > 100_000) throw new Error("Invalid exercise draft.");
    progress.drafts[id] = source;
  }
  for (const [id, completion] of Object.entries(value.completed)) {
    const exercise = exerciseById.get(id);
    if (!exercise || exercise.limitation || !isRecord(completion) || typeof completion.source !== "string" ||
        completion.source !== sourceFor(progress, exercise) || typeof completion.at !== "string" ||
        !Number.isFinite(Date.parse(completion.at))) throw new Error("Invalid completion record.");
    progress.completed[id] = { source: completion.source, at: completion.at };
  }
  return progress;
}

export function editDraft(progress: Progress, exercise: Exercise, source: string): Progress {
  const completed = { ...progress.completed };
  if (completed[exercise.id]?.source !== source) delete completed[exercise.id];
  const drafts = { ...progress.drafts };
  if (source === exercise.source) delete drafts[exercise.id];
  else drafts[exercise.id] = source;
  return { ...progress, drafts, completed };
}

export function markComplete(progress: Progress, exercise: Exercise, source: string): Progress {
  if (exercise.limitation || source !== sourceFor(progress, exercise)) return progress;
  return { ...progress, completed: { ...progress.completed, [exercise.id]: { source, at: new Date().toISOString() } } };
}
