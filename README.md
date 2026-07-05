# Pillow

Cogno's collaborative editor (canvas) extracted into a standalone Next.js app.
Multiple people edit one shared document live — TipTap + Y.js synced through a
Hocuspocus server. No auth. No database (the Hocuspocus server holds each room's
document in memory).

The realtime editor stack is ported from cogno's task-description editor:
TipTap v3 + Collaboration (Y.js), the slash (`/`) block menu, tables, Mermaid
diagrams, **Excalidraw** drawings, columns, link cards, and iframe embeds.

## Architecture

- **Next.js app** (this repo root) — the UI. Deploy to Vercel.
  - `/` is the canvas (shared room `main`).
  - `/canvas/<room>` opens a named room.
- **`hocuspocus/`** — the realtime WebSocket server. Deploy alone to Render.
  In-memory only (nothing persisted across restarts).

The app finds the server via `NEXT_PUBLIC_HOCUSPOCUS_URL`.

## Run locally

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

`.env.local` already points the app at `ws://localhost:1235`. Open
http://localhost:3000 in two browser tabs to edit together.

> Local note: cogno's own hocuspocus uses port 1234, so this app uses 1235 to
> avoid a clash. Change `NEXT_PUBLIC_HOCUSPOCUS_URL` if needed.

## Deploy

- **App → Vercel.** Set `NEXT_PUBLIC_HOCUSPOCUS_URL=wss://<service>.onrender.com`.
- **Server → Render.** Use `hocuspocus/render.yaml` (Blueprint), or create a Node
  web service with Root Directory `hocuspocus`, build `npm install`, start
  `npm start`. Render provides `PORT`.

## Deferred

- Audio → canvas: record a brainstorm, transcribe, have an LLM write structured
  notes into the live document. Hook a transcription provider + LLM to a route
  that pushes into the room's Y.Doc.
- Durable persistence (swap the in-memory server for `@hocuspocus/extension-database`).
