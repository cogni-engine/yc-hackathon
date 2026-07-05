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

## Architecture

Two servers. No database.

```
browser
  ├─ HTTP ─────▶ ① Next.js app (UI + /api/ai → Gemini)   :3000  (deploy: Vercel)
  └─ WebSocket ▶ ② Hocuspocus realtime server            :1235  (deploy: Render)
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
| `PORT` | hocuspocus | Listen port. Default `1234`. |

Copy `.env.example` → `.env.local` and fill in `GEMINI_API_KEY`.

## Run with Docker (one command)

Requires **Docker Desktop running** (`docker compose up` fails with a socket
error if the daemon is down — start Docker Desktop first).

```bash
docker compose up --build
```

- App → http://localhost:3000 (open two tabs to collaborate)
- Realtime server → host `:1235` (container `:1234`)

`GEMINI_API_KEY` is passed into the app container via `env_file: .env.local`, so
the Summarize action works in the compose stack. Stop with `docker compose down`.

## Run locally (dev, with hot reload)

Two processes:

```bash
# 1) realtime server (terminal A)
cd hocuspocus
npm install
PORT=1235 npm start        # ws://localhost:1235

# 2) Next.js app (terminal B)
pnpm install
pnpm dev                   # http://localhost:3000
```

`.env.local` already points the app at `ws://localhost:1235`.

> Ports: cogno's own hocuspocus uses 1234, so this app uses 1235 to avoid a clash.
> Don't run `docker compose` and `pnpm dev` at the same time — they bind the same
> ports (3000 / 1235).

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
