"use client";

import { Terminal, CheckCircle2, AlertCircle, LoaderCircle, CornerDownRight } from "lucide-react";
import type { CompileResult, CompilerStatus } from "@/lib/compiler";
import type { Exercise } from "@/lib/exercises";
import { isVerified } from "@/lib/compiler";

type Props = { result: CompileResult | null; busy: boolean; status: CompilerStatus; error: string; stale: boolean; exercise: Exercise; focusLine: (line: number) => void };

export function OutputPanel({ result, busy, status, error, stale, exercise, focusLine }: Props) {
  const verified = result ? isVerified(exercise, result) : false;
  const output = result ? [result.stdout, result.stderr, result.output, result.diagnostics?.length ? null : result.text, result.runtimeError, result.backendError ? `Browser compiler limitation:\n${result.backendError}` : null].filter(Boolean).join("\n\n") : "";
  const visibleOutput = output.length > 32_000 ? `${output.slice(0, 32_000)}\n\n[Display truncated to 32,000 characters.]` : output;
  return <section className="output-panel" aria-label="Compiler output">
    <div className="output-header"><span><Terminal size={15} /> TERMINAL</span><span className="output-engine"><span className="status-dot" /> rustc · WebAssembly</span></div>
    <div className="output-body" aria-live="polite" aria-busy={busy}>
      {busy ? <div className="compile-status"><LoaderCircle size={17} className="spin" /><span>{status.text}</span>{status.percent !== undefined ? <span>{Math.round(status.percent)}%</span> : null}</div> : null}
      {busy && status.percent !== undefined ? <div className="download-progress" role="progressbar" aria-label="Compiler download" aria-valuenow={Math.round(status.percent)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${status.percent}%` }} /></div> : null}
      {!busy && error ? <div className="result-banner failure"><AlertCircle size={17} />{error}</div> : null}
      {!busy && result ? <>
        <div className={`result-banner ${result.ok && (!exercise.test || (result.passed ?? 0) > 0 || exercise.limitation || result.verification === "check-only") ? "success" : "failure"}`}>{result.ok ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}<span>{stale ? "Code changed · run again to verify" : verified ? "Nicely done. Exercise complete!" : result.ok && result.verification === "check-only" ? "Type-check passed · native execution still needed" : result.ok && exercise.limitation ? "Check passed · native verification still needed" : result.ok && exercise.test ? "No tests passed. Restore the tests and try again." : "Keep going. The compiler left you a clue."}</span><small>{Math.round((result.compileMs ?? 0) + (result.execMs ?? 0))} ms</small></div>
        {result.diagnostics?.map((diagnostic, index) => <div className={`diagnostic ${diagnostic.level}`} key={index}>{diagnostic.line ? <button onClick={() => focusLine(diagnostic.line!)}><CornerDownRight size={13} />line {diagnostic.line}{diagnostic.code ? ` · ${diagnostic.code}` : ""}</button> : null}<pre>{diagnostic.rendered}</pre></div>)}
        {visibleOutput ? <pre className="program-output">{visibleOutput}</pre> : null}
      </> : null}
      {!busy && !result && !error ? <div className="terminal-welcome"><span className="terminal-prompt">❯</span><div><p>Ready when you are.</p><span>Run the code to see compiler feedback here.</span><small>The compiler downloads once, then stays cached in your browser.</small></div></div> : null}
    </div>
  </section>;
}
