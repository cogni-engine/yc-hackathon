/**
 * Presence PoC: measures how quickly the resident AI agent reacts WHILE a
 * human is still typing. Joins as a fake human, drafts a long unfinished
 * sentence slowly (~15 s), and records:
 *   - t_cursor:      first time another client shows a non-null caret
 *   - t_firstRemote: first remote (provider-origin) doc update after t0
 * Then watches 30 s more and prints a compact report. Always exits 0 — this
 * is a measurement tool, not an assertion.
 *
 *   npx tsx agent/tools/presence-poc.ts [room]
 *     room: numeric → `note:<room>` (default "6"), otherwise `canvas:<room>`
 */
import { installDom } from '../dom';
import { loadEnv } from '../env';

installDom();
loadEnv();

const HUMAN_NAME = 'Fake Human';
const TYPING_TARGET_MS = 15_000;
const WATCH_AFTER_MS = 30_000;
const MESSAGE =
  '## デモの手順を整理したい。まず前提として、リアルタイム編集とAIの';

async function run() {
  const { AgentSession, sleep } = await import('../session');

  const room = process.argv[2] || '6';
  const docName = /^\d+$/.test(room) ? `note:${room}` : `canvas:${room}`;
  const url =
    process.env.AGENT_HOCUSPOCUS_URL ||
    process.env.NEXT_PUBLIC_HOCUSPOCUS_URL ||
    'ws://localhost:1234';

  const log = (...a: unknown[]) =>
    console.log(`[poc ${new Date().toISOString().slice(11, 19)}]`, ...a);

  const session = new AgentSession({
    url,
    docName,
    name: HUMAN_NAME,
    color: '#F98181',
  });
  await session.connect();
  log(`synced to ${docName} @ ${url}`);
  log(`doc before: ${JSON.stringify(session.markdown()).slice(0, 120)}`);

  // --- instrumentation -----------------------------------------------------
  let typingStarted = false;
  let tFirstRemote: number | null = null; // first provider-origin update ≥ t0
  let remoteUpdates = 0; // provider-origin updates since t0

  session.ydoc.on('update', (_u: Uint8Array, origin: unknown) => {
    if (origin !== session.provider) return; // local edits don't count
    if (!typingStarted) return; // ignore initial sync traffic
    remoteUpdates++;
    if (tFirstRemote === null) {
      tFirstRemote = Date.now();
      log('first REMOTE edit observed (the AI touched the doc)');
    }
  });

  let tCursor: number | null = null; // first non-null caret from another client
  const awareness = session.provider.awareness;
  const poll = setInterval(() => {
    if (tCursor !== null) return;
    const states = awareness?.getStates();
    if (!states) return;
    for (const [clientId, state] of states.entries()) {
      if (clientId === awareness?.clientID) continue; // that's us
      const s = state as { user?: { name?: string }; cursor?: unknown };
      if (s.user?.name === HUMAN_NAME) continue; // also us (reconnects)
      if (s.cursor != null) {
        tCursor = Date.now();
        log(`AI caret appeared (client=${clientId} name="${s.user?.name ?? '?'}")`);
        break;
      }
    }
  }, 500);

  // --- act like a human drafting a thought ---------------------------------
  // 2-3 chars per beat, paced so the whole (unfinished) message takes ~15 s —
  // a wide-open window for the resident agent to react mid-draft.
  const chunks: string[] = [];
  for (let i = 0; i < MESSAGE.length; ) {
    const n = Math.min(2 + Math.floor(Math.random() * 2), MESSAGE.length - i);
    chunks.push(MESSAGE.slice(i, i + n));
    i += n;
  }
  const beat = Math.max(120, Math.round(TYPING_TARGET_MS / chunks.length));

  const t0 = Date.now();
  typingStarted = true;
  const secs = (t: number | null) =>
    t === null ? 'never' : `${((t - t0) / 1000).toFixed(1)}s`;

  const end = session.docEnd();
  await session.moveCursorTo(end, 300);
  session.insertNodeAt(end, { type: 'paragraph' });
  await session.moveCursorTo(end + 1, 200);

  log(`typing slowly (~${Math.round((beat * chunks.length) / 1000)}s): "${MESSAGE}"`);
  let pos = end + 1;
  for (const chunk of chunks) {
    pos = await session.typeText(chunk, pos);
    await sleep(beat);
  }
  const typingEndedAt = Date.now();
  // Deliberately UNFINISHED — no sentence end, caret stays where we stopped.
  log(`typing loop done at +${secs(typingEndedAt)}. watching ${WATCH_AFTER_MS / 1000}s more…`);

  // --- keep watching -------------------------------------------------------
  const watchStart = Date.now();
  let lastLen = session.markdown().length;
  while (Date.now() - watchStart < WATCH_AFTER_MS) {
    await sleep(1000);
    const len = session.markdown().length;
    if (len !== lastLen) {
      log(`doc changed: ${lastLen} → ${len} chars (${remoteUpdates} remote updates)`);
      lastLen = len;
    }
  }
  clearInterval(poll);

  // --- report --------------------------------------------------------------
  const reactedWhileTyping =
    tFirstRemote !== null && tFirstRemote <= typingEndedAt;

  console.log('\n=== presence-poc report ===');
  console.log(`doc:                          ${docName}`);
  console.log(`typing window:                t0 → +${secs(typingEndedAt)}`);
  console.log(`t0 → AI caret (t_cursor):     ${secs(tCursor)}`);
  console.log(`t0 → first AI edit:           ${secs(tFirstRemote)}`);
  console.log(`remote updates since t0:      ${remoteUpdates}`);
  console.log(`REACTED_WHILE_TYPING: ${reactedWhileTyping ? 'yes' : 'no'}`);
  console.log('\n--- final document (markdown) ---');
  console.log(session.markdown());

  session.destroy();
  process.exit(0);
}

run().catch(err => {
  console.error('[poc] fatal:', err);
  process.exit(0); // measurement tool — never fail the caller
});
