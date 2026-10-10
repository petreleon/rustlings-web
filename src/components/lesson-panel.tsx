"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowUpRight, BookOpen, Lightbulb, ChevronDown, ShieldCheck } from "lucide-react";
import { introduction, upstream, type Exercise, type Chapter } from "@/lib/exercises";

export function LessonPanel({ exercise, chapter }: { exercise: Exercise; chapter: Chapter }) {
  const [hintOpen, setHintOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  return <aside className="lesson-panel" aria-label="Exercise guidance">
    <div className="lesson-label"><BookOpen size={15} /> FIELD NOTES <span>#{String(exercise.order + 1).padStart(3, "0")}</span></div>
    <div className="lesson-intro"><span className="eyebrow">LEARN BY DOING</span><h2>Small steps.<br /><em>Stronger Rust.</em></h2><p>Read the code, follow the compiler, and make it work. Every error is a clue.</p><div className="rust-art" aria-hidden="true"><span className="art-orbit orbit-one" /><span className="art-orbit orbit-two" /><span className="art-code left">&amp;mut</span><span className="art-code right">fn()</span><span className="art-crab">🦀</span><span className="art-caption">one exercise at a time</span></div></div>
    <section className="task-notes"><h3>Your challenge</h3><p>{exercise.id === "intro1" ? "Run the starter program with Run code. Try adding a println!, then choose Next exercise when you’re ready. Your changes are saved automatically." : introduction(exercise.source) || (exercise.test ? "Complete the missing code and use the compiler feedback to guide your solution. The tests describe the expected behavior." : "Read the code and fix the errors. Run it to see what the compiler tells you.")}</p></section>
    {exercise.limitation ? <div className="limitation-note"><strong>{exercise.limitation === "threads" ? "Thread support is limited" : "Clippy needs native tools"}</strong><p>{exercise.limitation === "threads" ? "You can type-check this exercise here. Running its threads requires native Rustlings, so it won’t be marked complete in the browser." : "You can compile and run this code here. This compiler has no Clippy lints; finish verification in native Rustlings."}</p></div> : null}
    {exercise.browserNote ? <div className="limitation-note"><strong>Experimental compiler backend</strong><p>Some solutions use operations this WASM backend cannot generate yet. When that happens, the app type-checks your code and explains the limitation. A type-check alone does not complete the exercise.</p></div> : null}
    <section className="hint-section"><button aria-expanded={hintOpen} onClick={() => setHintOpen(!hintOpen)}><Lightbulb size={17} /><span>A little nudge</span><ChevronDown size={15} className={hintOpen ? "" : "collapsed"} /></button>{hintOpen ? <div className="hint-text">{exercise.id === "intro1" ? "This first exercise already compiles. Click Run code, then Next exercise to start fixing your first Rust error." : exercise.hint || "Read the compiler output carefully and take another look at the Rust book."}</div> : <p>Stuck? A hint is here when you need it.</p>}</section>
    <section className="chapter-notes"><button aria-expanded={notesOpen} onClick={() => setNotesOpen(!notesOpen)}><BookOpen size={16} /><span>About this topic</span><ChevronDown size={15} className={notesOpen ? "" : "collapsed"} /></button>{notesOpen ? <div className="markdown"><ReactMarkdown components={{ a: (props) => <a {...props} target="_blank" rel="noreferrer" /> }}>{chapter.readme || "Practice what you have learned in the Rust book. These exercises bring several topics together."}</ReactMarkdown></div> : null}</section>
    <div className="privacy-note"><ShieldCheck size={17} /><p>Your code stays with you.<span>Compilation runs in your browser. Progress is saved on this device.</span></p></div>
    <a className="upstream-link" href={`https://github.com/rust-lang/rustlings/blob/${upstream.commit}/exercises/${exercise.path}`} target="_blank" rel="noreferrer">Original Rustlings exercise <ArrowUpRight size={14} /></a>
  </aside>;
}
