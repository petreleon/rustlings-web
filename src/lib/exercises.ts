import corpus from "@/data/exercises.json";

export type Exercise = (typeof corpus.exercises)[number];
export type Chapter = (typeof corpus.chapters)[number];
export const exercises = corpus.exercises;
export const chapters = corpus.chapters;
export const upstream = corpus.meta;
export const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
export const assetUrl = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH || ""}${path}`;

export function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function exerciseTitle(exercise: Exercise) {
  const chapter = chapters.find((item) => item.id === exercise.chapter);
  const number = exercise.id.match(/\d+$/)?.[0];
  return `${titleCase(chapter?.title || exercise.chapter)}${number ? ` ${number}` : ""}`;
}

export function introduction(source: string) {
  const lines = source.split("\n");
  const comments: string[] = [];
  for (const line of lines) {
    if (line.startsWith("//")) comments.push(line.replace(/^\/\/ ?/, ""));
    else if (line.trim() && comments.length) break;
    else if (line.trim()) break;
  }
  if (!comments.length) {
    const start = lines.findIndex((line) => /\/\/ TODO:/.test(line));
    if (start !== -1) {
      for (const line of lines.slice(start)) {
        if (!line.trim().startsWith("//")) break;
        comments.push(line.trim().replace(/^\/\/ ?/, ""));
      }
    }
  }
  return comments.join("\n").replaceAll("TODO: ", "");
}
