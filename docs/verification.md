# Verification

Verified on 2026-10-10 with Node.js 26 locally, Chromium 154 on macOS, Rustlings v6.5.0, and the pinned `artifacts-test-7` browser toolchain. GitHub CI independently uses Node.js 24 on Ubuntu.

## Automated checks

- Eight regression tests pass: JSON backup round-trip, edit invalidation, stale-result rejection, malformed/oversized imports, corpus consistency, native-only exercise handling, and requiring actual passing tests rather than compilation alone.
- `npm run typecheck` passes.
- `npm run build` passes and generates a static `out/` directory including the compiler and sysroot assets.
- `npm audit` reports zero vulnerabilities at verification time.
- Archive and extracted compiler assets match their pinned SHA-256 hashes.

## Real browser execution

The browser compiled the bundled compiler to WebAssembly, then ran 88 upstream reference solutions through the actual worker. Six exercises initially identified as threads/Clippy were excluded. **80 solutions compiled and executed successfully**. The complete results, durations, toolchain identity, and worker hash are in [browser-reference-results.json](browser-reference-results.json).

The eight failures identified an additional thread exercise (`arc1`) and seven backend code-generation limitations. These remain recorded in the receipt. The app now identifies `arc1` as a thread exercise and automatically offers a labeled type-check after backend code generation fails. Trying optimization level zero did not resolve the failures; the shipped worker keeps the verified `-O` setting. No upstream exercise or reference solution was rewritten to make the compatibility result pass.

The 14 exercises with reference-solution verification limitations are:

| Limitation | Exercises | Browser behavior |
| --- | --- | --- |
| Thread execution | `arc1`, `threads1`, `threads2`, `threads3` | Type-check only; no completion |
| Clippy unavailable | `clippy1`, `clippy2`, `clippy3` | Compile/run; no Clippy completion |
| Backend integer operations | `hashmaps3`, `errors5`, `errors6`, `iterators4`, `from_into`, `from_str`, `try_from_into` | Attempt execution, then explicit type-check fallback if code generation fails; no completion for fallback |

Other correct solutions to the backend-sensitive exercises may avoid the affected operations and run successfully. The reference matrix establishes these particular solution results, not complete Rust language compatibility.

## Workbench interactions

Browser checks also covered:

- `intro1` compilation/execution and `intro2` real compiler error, correction, output, and completion.
- The complete upstream `if1` solution running all three tests; an incorrect implementation causing an actual test panic and no completion.
- Editing a completed solution clearing its completion, then surviving reload as an unfinished draft.
- Exporting a JSON backup and restoring drafts/completion through the import flow.
- `errors5` falling back to a successful type-check while preserving the backend error and withholding completion.
- `arc1` type-checking without completion, and cancelling an actual infinite loop by terminating its Worker.
- Mobile navigation at 390 × 844, closing the drawer on selection, and no page-level horizontal overflow.
- The exported production app served by `npm start` running the upstream `if1` solution with all three tests passing. Its resource requests stayed on the local origin; no external compilation service was used.

This is a static client application. Browser verification does not imply a publicly deployed website. Repository publication and hosting are separate actions.
