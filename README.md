# Pillow

A realtime collaborative canvas with an AI summarize action. Cogno's collaborative
editor extracted into a standalone Next.js app: multiple people edit one shared
document live (TipTap + Y.js synced through a Hocuspocus server), and any
drag-selection can be summarized by Gemini into the shared canvas.

No auth. No database — the Hocuspocus server holds each room's document in memory.

The editor stack is ported from cogno's task-description editor: TipTap v3 +
Collaboration (Y.js), the slash (`/`) block menu, tables, Mermaid diagrams,
**Excalidraw** drawings, columns, link cards, and iframe embeds.

## Features

- **Realtime co-editing** — open the same room in two tabs (or share the URL) and
  edit together, with live cursors.
- **Blocks** — `/` slash menu for headings, lists, tables, Mermaid, Excalidraw
  drawings, columns, etc.
- **Summarize a selection** — drag-select text in the canvas; a floating
  **Summarize** button appears; it sends just the selection to Gemini and inserts
  a 1–2 sentence summary as a blockquote right after it. The insert flows through
  the shared Y.Doc, so everyone sees it.

- **AI collaborator** — run `pnpm agent` and "Cogno AI" joins the room as a real
  realtime collaborator: its own named caret (green), human-like cursor moves,
  text typed character-by-character, Mermaid diagrams dropped in as blocks, and
  select-hold-delete edits. It watches the doc, thinks with Claude (keeping a
  running memory of what it has already contributed), and edits through the
  exact same Y.js/WebSocket path as a human tab.

## Architecture

Two servers. No database.

```
browser ──┬─ HTTP ─────▶ ① Next.js app (UI + /api/ai → Gemini)   :3000  (deploy: Vercel)
          └─ WebSocket ▶ ② Hocuspocus realtime server            :1234  (deploy: Render)
                              ▲
③ AI agent (pnpm agent) ──────┘  headless TipTap client + Claude — joins rooms
                                 like any other collaborator (awareness cursor,
                                 CRDT edits), zero changes to ① or ②
```

- **① Next.js app** (repo root) — serves the editor UI and the `/api/ai` route,
  which calls Gemini server-side. `/` is the canvas (shared room `main`);
  `/canvas/<room>` opens a named room.
- **② `hocuspocus/`** — the realtime WebSocket server. In-memory only (nothing is
  persisted across restarts). Deploy alone to Render.

The browser reaches ② via `NEXT_PUBLIC_HOCUSPOCUS_URL`.

## Environment variables

| Variable | Side | Purpose |
|---|---|---|
| `NEXT_PUBLIC_HOCUSPOCUS_URL` | app (build-time) | WebSocket URL of ②. Inlined into the client bundle at build — changing it needs a rebuild. Default `ws://localhost:1234`. |
| `GEMINI_API_KEY` | app (server) | Used by `/api/ai`. **Never** prefix with `NEXT_PUBLIC`. Get one at https://aistudio.google.com/apikey |
| `GEMINI_MODEL` | app (server) | Optional model override. Default `gemini-2.5-flash`. |
| `GEMINI_IMAGE_MODEL` | app/agent (server) | Optional image model override. Default `gemini-3.1-flash-image`. |
| `SUPABASE_URL` | app/agent (server) | Supabase project URL for generated image uploads. `NEXT_PUBLIC_SUPABASE_URL` also works, but server-only `SUPABASE_URL` is preferred. |
| `SUPABASE_SERVICE_ROLE_KEY` | app/agent (server) | Server-only key used to upload generated images to Supabase Storage. Do not expose it to the browser. |
| `SUPABASE_STORAGE_BUCKET` | app/agent (server) | Public Storage bucket for generated images. Default `generated-images`. |
| `SUPABASE_STORAGE_PREFIX` | app/agent (server) | Object prefix inside the bucket. Default `ai-images`. |
| `PORT` | hocuspocus | Listen port. Default `1234`. |

Copy `.env.example` → `.env.local` and fill in `GEMINI_API_KEY`.

For AI-generated images, create a public Supabase Storage bucket matching
`SUPABASE_STORAGE_BUCKET`; inserted images use the bucket's public object URL,
not signed URLs.

## Run with Docker (one command)

Requires **Docker Desktop running** (`docker compose up` fails with a socket
error if the daemon is down — start Docker Desktop first).

```bash
docker compose up --build
```

- App → http://localhost:3000 (open two tabs to collaborate)
- Realtime server → `:1234`

`GEMINI_API_KEY` is passed into the app container via `env_file: .env.local`, so
the Summarize action works in the compose stack. Stop with `docker compose down`.

## Run locally (dev, with hot reload)

Two processes:

```bash
# 1) realtime server (terminal A)
cd hocuspocus
npm install
npm start                  # ws://localhost:1234

# 2) Next.js app (terminal B)
pnpm install
pnpm dev                   # http://localhost:3000
```

`.env.local` already points the app at `ws://localhost:1234`.

## AI collaborator agent

```bash
pnpm agent            # follows the sidebar: joins the 6 most recent notes,
                      # picks up newly created notes automatically
pnpm agent 12         # pin to a single note (note:12)
```

Cogno AI connects to the Hocuspocus server as a normal WebSocket client
(headless TipTap under jsdom, schema-identical to the browser editor) and
lives on the note like a human teammate:

- **Resident presence** — its caret is ALWAYS on the note: parked where it
  last worked, sliding away from human carets so it never overlaps them, with
  a soft idle pulse (solid while typing).
- **Two brains, one cursor** — a reflex brain fires ~0.6s after a human
  STARTS typing (scaffolding, completions, quick fixes — never the block the
  human is editing) and keeps re-firing during long bursts; a deep brain runs
  after ~6s of quiet with full-document context and conversation memory. Both
  drive the same single cursor, serialized.
- **Layout ownership** — a shared "visual contract" (no empty-paragraph runs,
  clean hierarchy, compact diagrams) is injected into both brains; the deep
  brain tidies the note without being asked.
- **Choreography** — prose typed character-by-character; deletion is a
  human-style backspace (chars vanish one by one, accelerating); ```mermaid
  diagrams are drawn line-by-line so nodes appear one at a time, edited by
  line-diff (only changed lines vanish/appear), and deleted line-by-line.

### Brain providers

| Provider | When | Models (deep / fast) |
|---|---|---|
| `anthropic-api` | `ANTHROPIC_API_KEY` set | `AGENT_MODEL` (claude-opus-4-8) / `AGENT_FAST_MODEL` (haiku 4.5) |
| `claude-cli` | local dev, logged-in `claude` CLI, no keys needed | `sonnet` / `haiku` (subscription) |
| `gemini` | `AGENT_BRAIN=gemini` or only `GEMINI_API_KEY` available | `GEMINI_MODEL` (gemini-2.5-flash) / same |

Selection is automatic (`ANTHROPIC_API_KEY` → local CLI → `GEMINI_API_KEY`);
force a family with `AGENT_BRAIN=claude|gemini`. **Production note:** servers
have no logged-in CLI — set `ANTHROPIC_API_KEY` or `GEMINI_API_KEY`. The
compose stack runs the agent as its own service (`AGENT_BRAIN=gemini`,
in-network `AGENT_HOCUSPOCUS_URL=ws://hocuspocus:1234`); standalone deploys
can use `Dockerfile.agent`.

Other env (auto-read from `.env.local`): `AGENT_HOCUSPOCUS_URL` /
`NEXT_PUBLIC_HOCUSPOCUS_URL`, `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (notes list), `AGENT_NOTE_ID`, `AGENT_NAME`,
`AGENT_COLOR`.

E2E harnesses (no browser needed):

```bash
npx tsx agent/tools/fake-human.ts 5      # types a question into note:5, reports AI edits
npx tsx agent/tools/presence-poc.ts 5    # types SLOWLY for ~15s, measures how fast the
                                         # AI caret appears / reacts WHILE still typing
```

> Don't run `docker compose` and `pnpm dev` at the same time — they bind the same
> ports (3000 / 1234). If port 1234 is taken (e.g. another Hocuspocus running),
> set `PORT=<other>` for the server and update `NEXT_PUBLIC_HOCUSPOCUS_URL`.

## Deploy

- **App → Vercel.** Set `NEXT_PUBLIC_HOCUSPOCUS_URL=wss://<service>.onrender.com`
  and `GEMINI_API_KEY` (server env). Changing the WS URL requires a redeploy
  (it's baked at build time).
- **Realtime server → Render.** Use `hocuspocus/render.yaml` (Blueprint), or a
  Node web service with Root Directory `hocuspocus`, build `npm install`, start
  `npm start`. Render provides `PORT`. In-memory, so run a single instance —
  multiple instances would not share the same room state.

## Notes / deferred

- Persistence: swap the in-memory Hocuspocus server for
  `@hocuspocus/extension-database` (Postgres) to survive restarts.
- Auth is intentionally absent (hackathon scope).
