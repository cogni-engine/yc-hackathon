# Cogno AI — realtime collaborator agent

A headless AI teammate that joins a canvas room **exactly like a browser tab** —
same Y.js CRDT sync, same Hocuspocus WebSocket, same TipTap schema, same
awareness presence (a visible named caret). It watches for human edits, thinks
with **Claude**, and edits the shared document with human-like cursor
choreography. No frontend changes required.

## Run

```bash
pnpm agent <noteId>   # joins the note open at /notes/<noteId>
```

`<noteId>` is the id in the URL when you open a note (`/notes/<id>`). The agent
joins the Hocuspocus document `note:{noteId}` — the **same** room that note's
browser tabs use — so it collaborates directly on that note. One agent process
serves one note; run several (or a supervisor) to cover multiple notes.

Requires a Hocuspocus server reachable at the configured URL (the app's realtime
server — see `hocuspocus/`).

## Environment (`.env.local` is auto-loaded from the repo root)

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | **required** — the agent thinks with Claude |
| `AGENT_MODEL` | model override (default `claude-opus-4-8`) |
| `NEXT_PUBLIC_HOCUSPOCUS_URL` / `AGENT_HOCUSPOCUS_URL` | WebSocket URL (default `ws://localhost:1234`) |
| `AGENT_NOTE_ID` | note id to join (alias `AGENT_ROOM`); overridden by the CLI arg |
| `AGENT_DOC_PREFIX` | document-name prefix (default `note:` — matches the browser) |
| `AGENT_NAME` / `AGENT_COLOR` | presence identity (caret label + colour) |

## How it works

- **Joins like a peer** — headless TipTap under jsdom bound to the shared
  `note:{noteId}` Y.Doc. Its green "Cogno AI" caret is broadcast over the same
  y-protocols awareness the browser's `CollaborationCaret` renders.
  `agent/schema.ts` is kept **schema-identical** to the browser editor
  (`src/features/notes/lib/collaborativeExtensions.ts`) so the CRDT binding never
  normalizes/corrupts documents.
- **Event-driven trigger** — sleeps until a *human* edit arrives, waits for a
  ~2.5s quiet gap (+ cooldown), then acts. Idle cost is zero (no polling).
- **Thinks with Claude** — `claude-opus-4-8`, adaptive thinking, `effort: low`,
  returning structured `{thought, ops}` (append_after / replace / delete on
  stable blockIds) via `output_config.format`.
- **Stateful memory** — the brain keeps a running Claude conversation for the
  whole session, so it remembers its own past contributions and builds on them
  instead of re-reacting from scratch (and won't repeat itself).
- **Human-like choreography** — the caret moves and settles before writing,
  prose is typed character-by-character, structured blocks (`​```mermaid`,
  tables, lists) drop in whole, and deletions select-hold-then-delete. The caret
  lingers where it stopped while idle (a 15s heartbeat keeps presence alive),
  the way a human teammate's cursor stays put — and clears on shutdown.

## Files

| File | Role |
|---|---|
| `index.ts` | entrypoint — installs the jsdom DOM, loads env, runs `main` |
| `main.ts` | the watch/act loop (trigger, debounce, op execution, choreography) |
| `session.ts` | `AgentSession` — connection, presence, humanized editing primitives |
| `brain.ts` | `CognoBrain` — the stateful Claude decision-maker |
| `schema.ts` | headless twin of the browser editor's extension set |
| `dom.ts` / `env.ts` | jsdom bootstrap / `.env.local` loader |
| `tools/fake-human.ts` | E2E driver — a scripted peer that types and reports the AI's reaction |
| `standalone/` | earlier standalone impersonator (`.mjs`), kept for reference |

## E2E smoke test (no browser)

A scripted "fake human" types a question and reports the AI's presence + edits:

```bash
npx tsx agent/tools/fake-human.ts some-room "このアプリの全体構成を教えて"
```
