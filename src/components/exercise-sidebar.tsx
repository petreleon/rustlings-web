"use client";

import { useState } from "react";
import { Search, ChevronDown, Check, Circle, X, ArrowUpRight } from "lucide-react";
import { chapters, exercises, titleCase } from "@/lib/exercises";
import { isComplete, type Progress } from "@/lib/progress";

type Props = { progress: Progress; select: (id: string) => void; open: boolean; close: () => void };

export function ExerciseSidebar({ progress, select, open, close }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const selected = exercises.find((exercise) => exercise.id === progress.selected)!;
  const remaining = exercises.filter((exercise) => !isComplete(progress, exercise)).length;
  const matches = exercises.filter((exercise) =>
    `${exercise.id} ${exercise.chapter}`.toLowerCase().includes(search.toLowerCase()) &&
    (filter === "all" || (filter === "remaining" ? !isComplete(progress, exercise) : isComplete(progress, exercise))));
  return <>
    {open ? <button className="sidebar-scrim" onClick={close} aria-label="Close exercise navigation" /> : null}
    <aside className={`sidebar ${open ? "is-open" : ""}`} aria-label="Exercise navigation">
      <div className="sidebar-title"><span>YOUR LEARNING PATH</span><button className="icon-button mobile-only" onClick={close} aria-label="Close navigation"><X size={18} /></button></div>
      <label className="search-box"><Search size={15} /><input id="exercise-search" aria-label="Search exercises" placeholder="Find an exercise…" value={search} onChange={(event) => setSearch(event.target.value)} /><kbd>/</kbd></label>
      <div className="filter-tabs" aria-label="Filter exercises">{["all", "remaining", "completed"].map((item) => <button key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item === "remaining" ? "To do" : titleCase(item)}</button>)}</div>
      <nav className="chapter-list">
        {chapters.map((chapter) => {
          const all = exercises.filter((exercise) => exercise.chapter === chapter.id);
          const visible = matches.filter((exercise) => exercise.chapter === chapter.id);
          if (!visible.length) return null;
          const expanded = !!search || (toggled[chapter.id] ?? chapter.id === selected.chapter);
          const done = all.filter((exercise) => isComplete(progress, exercise)).length;
          return <section className="chapter" key={chapter.id}>
            <button className={`chapter-button ${chapter.id === selected.chapter ? "current" : ""}`} aria-expanded={expanded} onClick={() => setToggled((current) => ({ ...current, [chapter.id]: !expanded }))}>
              <ChevronDown size={14} className={expanded ? "" : "collapsed"} /><span>{titleCase(chapter.title)}</span><small>{done}/{all.length}</small>
            </button>
            {expanded ? <div className="exercise-list">{visible.map((exercise) => <button key={exercise.id} className={`exercise-link ${exercise.id === progress.selected ? "selected" : ""}`} aria-current={exercise.id === progress.selected ? "page" : undefined} onClick={() => { select(exercise.id); close(); }}>
              {isComplete(progress, exercise) ? <Check size={13} className="solved-icon" /> : <Circle size={10} />}<span>{exercise.id}</span>{exercise.limitation ? <span className="native-dot" title="Native tools needed for full verification" /> : null}
            </button>)}</div> : null}
          </section>;
        })}
        {!matches.length ? <p className="empty-search">No exercises match your search.</p> : null}
      </nav>
      <div className="sidebar-bottom"><div className="small-crab">🦀</div><p>A little Rust, every day.<span>{remaining} exercises left to explore.</span></p><a href="https://doc.rust-lang.org/book/" target="_blank" rel="noreferrer" aria-label="Open the Rust book"><ArrowUpRight size={17} /></a></div>
    </aside>
  </>;
}
