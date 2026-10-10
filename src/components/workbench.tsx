"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, ArrowRight, ArrowUpRight, Braces, Check, ChevronRight, Download, FileCode2, Github, LoaderCircle, Menu, Play, RotateCcw, Square, Upload, X } from "lucide-react";
import { exerciseById, exercises, chapters, exerciseTitle, titleCase, upstream } from "@/lib/exercises";
import { editDraft, isComplete, markComplete, MAX_IMPORT_BYTES, parseProgress, sourceFor } from "@/lib/progress";
import { BrowserCompiler, isVerified, type CompileResult, type CompilerStatus } from "@/lib/compiler";
import { useProgress } from "@/hooks/use-progress";
import type { EditorHandle } from "./code-editor";
import { ExerciseSidebar } from "./exercise-sidebar";
import { LessonPanel } from "./lesson-panel";
import { OutputPanel } from "./output-panel";

const CodeEditor = dynamic(() => import("./code-editor"), { ssr: false, loading: () => <div className="editor-loading"><LoaderCircle size={18} className="spin" /> Loading editor…</div> });

export function Workbench() {
  const { progress, update, ready, storageError } = useProgress();
  const [navOpen, setNavOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<CompilerStatus>({ text: "Ready" });
  const [result, setResult] = useState<CompileResult | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [ranSource, setRanSource] = useState("");
  const compiler = useRef<BrowserCompiler | null>(null);
  const editor = useRef<EditorHandle>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const exercise = exerciseById.get(progress.selected) || exercises[0];
  const chapter = chapters.find((item) => item.id === exercise.chapter)!;
  const source = sourceFor(progress, exercise);
  const done = exercises.filter((item) => isComplete(progress, item)).length;
  const percent = Math.round(done / exercises.length * 100);
  const complete = isComplete(progress, exercise);

  useEffect(() => () => { request.current++; compiler.current?.cancel(); }, []);
  useEffect(() => {
    request.current++;
    compiler.current?.cancel();
    setBusy(false);
    setResult(null);
    setError("");
  }, [exercise.id]);
  useEffect(() => {
    if (!ready) return;
    const id = window.location.hash.slice(1);
    if (exerciseById.has(id)) update((current) => ({ ...current, selected: id }));
  }, [ready, update]);

  const stop = useCallback(() => {
    request.current++;
    compiler.current?.cancel();
    setBusy(false);
    setError("Execution stopped. Your code is saved.");
  }, []);

  const select = useCallback((id: string) => {
    request.current++;
    compiler.current?.cancel();
    setBusy(false);
    setResult(null);
    setError("");
    update((current) => ({ ...current, selected: id }));
    window.history.replaceState(null, "", `#${id}`);
  }, [update]);

  const run = useCallback(async () => {
    if (busy || !ready) return;
    const id = ++request.current;
    const input = source;
    setBusy(true);
    setResult(null);
    setError("");
    setRanSource(input);
    compiler.current ??= new BrowserCompiler();
    try {
      const output = await compiler.current.run(exercise, input, (next) => { if (id === request.current) setStatus(next); });
      if (id !== request.current) return;
      setResult(output);
      if (isVerified(exercise, output)) update((current) => markComplete(current, exercise, input));
    } catch (failure) {
      if (id === request.current) setError(failure instanceof Error ? failure.message : "The compiler could not run. Try again.");
    } finally { if (id === request.current) setBusy(false); }
  }, [busy, ready, source, exercise, update]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); void run(); }
      if (event.key === "Escape" && busy) stop();
      const target = event.target as HTMLElement;
      if (event.key === "/" && !target.closest("input, textarea, [contenteditable]")) {
        event.preventDefault(); setNavOpen(true); requestAnimationFrame(() => document.getElementById("exercise-search")?.focus());
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [run, busy, stop]);

  const edit = useCallback((next: string) => update((current) => editDraft(current, exercise, next)), [exercise, update]);

  function exportProgress() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(progress, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = `rustlings-progress-${new Date().toISOString().slice(0, 10)}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Progress exported. Keep this file to move your work to another browser.");
  }

  async function importProgress(file?: File) {
    if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error("Progress file exceeds 2 MB.");
      const imported = parseProgress(await file.text());
      if (!window.confirm("Replace the progress on this device with this backup? Export your current progress first if you want to keep it.")) return;
      select(imported.selected);
      update(() => imported);
      setNotice("Progress restored from your backup.");
    } catch (failure) { setNotice(failure instanceof Error ? failure.message : "This progress file could not be imported."); }
    finally { if (fileInput.current) fileInput.current.value = ""; }
  }

  function resetExercise() {
    if (!window.confirm(`Reset ${exercise.id} to its original code? This also clears its completion.`)) return;
    select(exercise.id);
    update((current) => {
      const next = editDraft(current, exercise, exercise.source);
      const completed = { ...next.completed };
      delete completed[exercise.id];
      return { ...next, completed };
    });
  }

  return <div className="app-shell">
    <header className="app-header">
      <div className="brand"><button className="icon-button mobile-only" onClick={() => setNavOpen(true)} aria-label="Open exercise navigation"><Menu size={20} /></button><div className="brand-mark"><Braces size={25} /><span>🦀</span></div><span>rustlings<span className="brand-web">/web</span></span><span className="beta-badge">BETA</span></div>
      <div className="header-center"><span className="status-dot" /> A SMALL PRACTICE. A BIG DIFFERENCE.</div>
      <div className="header-actions"><button className="icon-button" onClick={exportProgress} disabled={!ready} title="Export progress" aria-label="Export progress"><Download size={17} /></button><button className="icon-button" onClick={() => fileInput.current?.click()} disabled={!ready} title="Import progress" aria-label="Import progress"><Upload size={17} /></button><span className="header-divider" /><a href="https://github.com/petreleon/rustlings-web" target="_blank" rel="noreferrer" className="github-link" aria-label="View source on GitHub"><Github size={17} /><span>Source</span><ArrowUpRight size={13} /></a><input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={(event) => void importProgress(event.target.files?.[0])} /></div>
    </header>
    <div className="workspace">
      <ExerciseSidebar progress={progress} select={select} open={navOpen} close={() => setNavOpen(false)} />
      <main className="main-workbench" id="main">
        <div className="path-header"><span>THE RUSTLINGS JOURNEY</span><div className="overall-progress"><span><strong>{done}</strong> / {exercises.length} completed</span><div className="progress-track" aria-label={`${percent}% complete`}><span style={{ width: `${percent}%` }} /></div><small>{percent}%</small></div></div>
        {storageError || notice ? <div className={`notice ${storageError ? "storage-warning" : ""}`} role="status"><span>{storageError || notice}</span>{notice && !storageError ? <button onClick={() => setNotice("")} aria-label="Dismiss notice"><X size={14} /></button> : null}</div> : null}
        <div className="exercise-heading"><div className="breadcrumb">Exercises <ChevronRight size={13} />{titleCase(chapter.title)}<ChevronRight size={13} /><span>{exercise.id}</span></div><div className="heading-row"><div><h1>{exerciseTitle(exercise)}<span className={`exercise-status ${complete ? "is-complete" : ""}`}>{complete ? <><Check size={11} /> Completed</> : exercise.limitation ? "Native check needed" : "In progress"}</span></h1><p>{exercise.test ? "Make the tests pass. Build your understanding." : "Make it compile. See what happens."}</p></div><span className="exercise-number">{String(exercise.order + 1).padStart(2, "0")}<span> / {exercises.length}</span></span></div></div>
        <div className="editor-card"><div className="editor-toolbar"><div className="file-tab"><FileCode2 size={15} /><span>{exercise.id}.rs</span><span className="file-dot" /></div><div className="editor-controls"><span className="autosave"><span className="status-dot" />{storageError ? "Session only" : ready ? "Autosaved locally" : "Loading progress…"}</span><button className="icon-button" onClick={resetExercise} disabled={!ready || busy} aria-label="Reset exercise" title="Reset exercise"><RotateCcw size={15} /></button></div></div>
          {ready ? <CodeEditor key={exercise.id} ref={editor} source={source} onChange={edit} /> : <div className="editor-loading"><LoaderCircle size={18} className="spin" /> Restoring your workspace…</div>}
          <div className="editor-footer"><span>Rust <span>·</span> Edition 2024</span><span>UTF-8 <span>·</span> {source.split("\n").length} lines</span></div>
        </div>
        <div className="run-bar"><div className="run-explainer"><span className="status-dot" />{exercise.limitation === "threads" ? "Type-check in your browser" : exercise.test ? "Tests run right in your browser" : "Compile & run in your browser"}</div><div>{busy ? <button className="run-button stop-button" onClick={stop}><Square size={14} fill="currentColor" />Stop <kbd>esc</kbd></button> : <button className="run-button" onClick={() => void run()} disabled={!ready}><Play size={15} fill="currentColor" />{exercise.limitation === "threads" ? "Check code" : exercise.test ? "Run tests" : "Run code"}<kbd>⌘ ↵</kbd></button>}</div></div>
        <OutputPanel result={result} busy={busy} status={status} error={error} stale={!!result && ranSource !== source} exercise={exercise} focusLine={(line) => editor.current?.focusLine(line)} />
        <div className="exercise-navigation"><button disabled={exercise.order === 0} onClick={() => select(exercises[exercise.order - 1].id)}><ArrowLeft size={16} />Previous exercise</button><span>{complete ? "Onward. You’ve got this." : "Progress, one small step at a time."}</span><button disabled={exercise.order === exercises.length - 1} onClick={() => select(exercises[exercise.order + 1].id)}>Next exercise<ArrowRight size={16} /></button></div>
        <footer className="workspace-footer"><span>Built for the joy of learning Rust.</span><a href={`https://github.com/rust-lang/rustlings/tree/${upstream.version}`} target="_blank" rel="noreferrer">Rustlings {upstream.version} <ArrowUpRight size={11} /></a></footer>
      </main>
      <LessonPanel key={exercise.id} exercise={exercise} chapter={chapter} />
    </div>
  </div>;
}
