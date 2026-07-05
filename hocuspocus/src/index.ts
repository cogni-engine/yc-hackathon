import { Server } from '@hocuspocus/server';

/**
 * Minimal realtime collaboration server for the canvas.
 *
 * - No auth (hackathon): any client may connect to any `canvas:{room}` doc.
 * - In-memory only: the Y.Doc for each room lives in this process and is shared
 *   across all connected clients. Nothing is persisted — when the server
 *   restarts, rooms start empty. Swap in @hocuspocus/extension-database later
 *   for durable storage.
 *
 * Deploy this alone (e.g. to Render). Point the Next.js app at it via
 * NEXT_PUBLIC_HOCUSPOCUS_URL (wss://<your-service>.onrender.com).
 */

const port = Number(process.env.PORT) || 1234;

const server = Server.configure({
  port,
  name: 'canvas-hocuspocus',

  async onConnect({ documentName }) {
    console.log(`+ connect ${documentName}`);
  },

  async onDisconnect({ documentName }) {
    console.log(`- disconnect ${documentName}`);
  },
});

server.listen().then(() => {
  console.log(`canvas-hocuspocus listening on :${port}`);
});
