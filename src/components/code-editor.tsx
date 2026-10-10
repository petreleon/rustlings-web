"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { rust } from "@codemirror/lang-rust";
import { oneDark } from "@codemirror/theme-one-dark";

export type EditorHandle = { focusLine: (line: number) => void };
type Props = { source: string; onChange: (source: string) => void };

const editorTheme = EditorView.theme({
  "&": { height: "100%", backgroundColor: "#141819", fontSize: "13px" },
  ".cm-scroller": { overflow: "auto", fontFamily: "var(--font-mono)", lineHeight: "1.85" },
  ".cm-content": { padding: "24px 0", minHeight: "320px" },
  ".cm-line": { padding: "0 24px 0 12px" },
  ".cm-gutters": { backgroundColor: "#141819", borderRight: "none", color: "#545c59", padding: "0 8px 0 14px" },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "#ffffff04" },
  "&.cm-focused": { outline: "none" },
  ".cm-cursor": { borderLeftColor: "#f4a57b" },
});

const CodeEditor = forwardRef<EditorHandle, Props>(function CodeEditor({ source, onChange }, ref) {
  const parent = useRef<HTMLDivElement>(null);
  const editor = useRef<EditorView | null>(null);
  const callback = useRef(onChange);
  const initialSource = useRef(source);
  useEffect(() => { callback.current = onChange; }, [onChange]);
  useEffect(() => {
    if (!parent.current) return;
    const view = new EditorView({
      doc: initialSource.current,
      parent: parent.current,
      extensions: [basicSetup, rust(), oneDark, editorTheme,
        EditorView.contentAttributes.of({ "aria-label": "Rust source code", "spellcheck": "false" }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) callback.current(update.state.doc.toString());
        }),
      ],
    });
    editor.current = view;
    return () => { view.destroy(); editor.current = null; };
  }, []);
  useEffect(() => {
    const view = editor.current;
    if (view && view.state.doc.toString() !== source) view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: source } });
  }, [source]);
  useImperativeHandle(ref, () => ({ focusLine(line) {
    const view = editor.current;
    if (!view) return;
    const position = view.state.doc.line(Math.max(1, Math.min(line, view.state.doc.lines))).from;
    view.dispatch({ selection: { anchor: position }, effects: EditorView.scrollIntoView(position, { y: "center" }) });
    view.focus();
  } }), []);
  return <div className="code-editor" ref={parent} />;
});

export default CodeEditor;
