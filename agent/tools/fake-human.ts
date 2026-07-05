/**
 * E2E test driver: joins a room as a fake human, types a question the way a
 * person would, then reports what the AI collaborator does — awareness
 * (presence/caret) events and document changes.
 *
 *   npx tsx agent/tools/fake-human.ts [room] ["message to type"]
 */
import { installDom } from '../dom';
import { loadEnv } from '../env';

installDom();
loadEnv();

async function run() {
  const { AgentSession, sleep } = await import('../session');

  const room = process.argv[2] || 'agent-poc';
  const message =
    process.argv[3] ||
    'AIさん、このアプリの全体構成を説明して。可能なら図もお願いします。';
  const url =
    process.env.AGENT_HOCUSPOCUS_URL ||
    process.env.NEXT_PUBLIC_HOCUSPOCUS_URL ||
    'ws://localhost:1234';

  const log = (...a: unknown[]) =>
    console.log(`[human ${new Date().toISOString().slice(11, 19)}]`, ...a);

  const session = new AgentSession({
    url,
    room,
    name: 'Fake Human',
    color: '#F98181',
  });
  await session.connect();
  log(`synced. doc: ${JSON.stringify(session.markdown()).slice(0, 120)}`);

  // Watch awareness — we want to SEE the AI join and move its caret.
  const awareness = session.provider.awareness;
  let lastCursorLog = 0;
  awareness?.on('change', () => {
    const states = Array.from(awareness.getStates().entries());
    for (const [clientId, state] of states) {
      const s = state as { user?: { name?: string }; cursor?: unknown };
      if (s.user?.name && s.user.name !== 'Fake Human') {
        const now = Date.now();
        if (now - lastCursorLog > 1000) {
          lastCursorLog = now;
          log(
            `presence: client=${clientId} name="${s.user.name}" cursor=${
              s.cursor ? 'VISIBLE (moving)' : 'none'
            }`
          );
        }
      }
    }
  });

  let remoteEdits = 0;
  session.ydoc.on('update', (_u: Uint8Array, origin: unknown) => {
    if (origin === session.provider) remoteEdits++;
  });

  // Type like a person: cursor to end, small pause, character by character.
  const end = session.docEnd();
  await session.moveCursorTo(end, 300);
  session.insertNodeAt(end, { type: 'paragraph' });
  await session.moveCursorTo(end + 1, 200);
  log(`typing: "${message}"`);
  await session.typeText(message, end + 1);
  session.clearCursor();
  log('typed. now waiting for the AI (90s window)…');

  const start = Date.now();
  let lastLen = session.markdown().length;
  while (Date.now() - start < 90_000) {
    await sleep(2000);
    const md = session.markdown();
    if (md.length !== lastLen) {
      log(`doc changed: ${lastLen} → ${md.length} chars (${remoteEdits} remote updates so far)`);
      lastLen = md.length;
    }
  }

  log('--- final document ---');
  console.log(session.markdown());
  log(`remote edits received: ${remoteEdits}`);
  session.destroy();
  process.exit(0);
}

run().catch(err => {
  console.error('[human] fatal:', err);
  process.exit(1);
});
