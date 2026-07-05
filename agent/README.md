# Pillow ambient agent

A headless AI teammate that **joins a note the same way a browser tab does** —
it opens a Hocuspocus connection to `note:{id}`, shows up in the collaborator
list, watches the shared Y.Doc, and (once human edits go quiet) appends one
short Gemini observation as a blockquote. That write flows through the shared
doc, so it appears live in every open browser — the same path the Recall
transcript bot uses (`../hocuspocus/src/recallWebhook.ts`).

## Run

Needs the Hocuspocus server (`../hocuspocus`) and, ideally, the app running.

```bash
cd agent
npm install
AGENT_NOTE_ID=1 GEMINI_API_KEY=... npm start
```

Open that note (`/notes/1`) in the app and type — after a few quiet seconds the
agent drops in a `🤖` comment.

Offline test (no Gemini key): `AGENT_NOTE_ID=1 AI_MOCK=1 npm start`.

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `AGENT_NOTE_ID` | *(required)* | Numeric id of the note to join (`note:{id}`). |
| `GEMINI_API_KEY` | — | Required unless `AI_MOCK=1`. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Model override (matches the app's `/api/ai`). |
| `HOCUSPOCUS_URL` | `ws://localhost:1234` | Realtime server URL. |
| `AGENT_NAME` | `Agent 🤖` | Name shown in presence. |
| `AGENT_COLOR` | `#0ea5e9` | Presence color. |
| `AGENT_QUIET_MS` | `6000` | Wait this long after the last edit before commenting. |
| `AGENT_MIN_INTERVAL_MS` | `30000` | Minimum gap between comments. |
| `AI_MOCK` | — | `1` = canned comment, no Gemini call. |

## Notes / next steps

- **Ambient** by design: it comments on its own as the doc changes. To make it
  reply only when summoned, gate `think()` on a trigger (e.g. a line containing
  `@agent`) instead of every non-agent edit.
- It appends plain blockquotes. To make its caret visibly move while it writes,
  drive the `aiCursor` Y.Map that `AiCursorExtension` already renders.
- One agent process = one note. Run several, or wrap the join logic in a loop
  over multiple `note:{id}`s, to cover more notes.
