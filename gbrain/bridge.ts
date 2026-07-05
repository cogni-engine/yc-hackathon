/**
 * gbrain bridge — a tiny HTTP wrapper over the gbrain CLI.
 *
 * Why this exists: on PGLite the brain is single-writer, so `gbrain serve --http`
 * cannot run alongside CLI writes (`gbrain put`) or hybrid queries (`gbrain query`
 * embeds) — they deadlock on the PGLite lock. So this process is the *sole* owner
 * of the brain: every request shells the gbrain CLI, and all ops are serialized.
 * The same interface is used in prod against Supabase Postgres (where concurrency
 * is fine), keeping local and prod symmetric without an MCP client.
 *
 * Endpoints (all JSON, optional Bearer auth via GBRAIN_BRIDGE_TOKEN):
 *   GET  /health              -> { status, engine }
 *   POST /write { slug, markdown }         -> gbrain put   (create/update one page)
 *   POST /query { q, mode? }   mode=query|search  -> retrieval, returns { text }
 */

// $PORT is injected by Render; GBRAIN_BRIDGE_PORT/GBRAIN_PORT override locally.
const PORT = Number(
  process.env.GBRAIN_BRIDGE_PORT ??
    process.env.PORT ??
    process.env.GBRAIN_PORT ??
    3131
);
const TOKEN = process.env.GBRAIN_BRIDGE_TOKEN ?? '';

// Serialize brain ops: PGLite is single-writer, and even on Postgres this keeps
// CLI invocations from stampeding. Ops run one at a time, in arrival order.
let chain: Promise<unknown> = Promise.resolve();
function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined
  );
  return run as Promise<T>;
}

interface GbrainResult {
  code: number;
  stdout: string;
  stderr: string;
}

async function runGbrain(
  args: string[],
  stdin?: string
): Promise<GbrainResult> {
  const proc = Bun.spawn(['gbrain', ...args], {
    stdin: stdin != null ? new TextEncoder().encode(stdin) : 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  return { code, stdout, stderr };
}

// gbrain writes a noisy "[ai.gateway] recipe ..." line to stderr on every call.
function cleanNoise(s: string): string {
  return s
    .split('\n')
    .filter(line => !/\[ai\.gateway\]/.test(line))
    .join('\n')
    .trim();
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function authorized(req: Request): boolean {
  if (!TOKEN) return true; // open in local dev when no token is configured
  return req.headers.get('authorization') === `Bearer ${TOKEN}`;
}

const server = Bun.serve({
  port: PORT,
  idleTimeout: 120, // gbrain query can take a while (embeddings + LLM synthesis)
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === 'GET' && url.pathname === '/health') {
      return json({ status: 'ok', engine: process.env.DATABASE_URL ? 'postgres' : 'pglite' });
    }

    if (!authorized(req)) return json({ error: 'unauthorized' }, 401);

    // Write / update a single page. Idempotent by slug: same slug => update.
    if (req.method === 'POST' && url.pathname === '/write') {
      let body: { slug?: string; markdown?: string };
      try {
        body = await req.json();
      } catch {
        return json({ error: 'invalid_json' }, 400);
      }
      const slug = (body.slug ?? '').trim();
      const markdown = body.markdown ?? '';
      if (!slug) return json({ error: 'missing_slug' }, 400);
      if (!markdown.trim()) return json({ error: 'empty_markdown' }, 400);

      const result = await serialize(() =>
        runGbrain(['put', slug, '--content', markdown])
      );
      if (result.code !== 0) {
        return json(
          { error: 'gbrain_put_failed', slug, detail: cleanNoise(result.stderr) || cleanNoise(result.stdout) },
          502
        );
      }
      return json({ ok: true, slug });
    }

    // Retrieve. mode=query (hybrid, default) or search (keyword).
    if (req.method === 'POST' && url.pathname === '/query') {
      let body: { q?: string; mode?: string };
      try {
        body = await req.json();
      } catch {
        return json({ error: 'invalid_json' }, 400);
      }
      const q = (body.q ?? '').trim();
      if (!q) return json({ error: 'missing_q' }, 400);
      const mode = body.mode === 'search' ? 'search' : 'query';

      const result = await serialize(() => runGbrain([mode, q]));
      if (result.code !== 0) {
        return json(
          { error: 'gbrain_query_failed', detail: cleanNoise(result.stderr) || cleanNoise(result.stdout) },
          502
        );
      }
      return json({ ok: true, mode, q, text: cleanNoise(result.stdout) });
    }

    return json({ error: 'not_found' }, 404);
  },
});

console.log(`gbrain-bridge listening on :${server.port} (auth: ${TOKEN ? 'on' : 'off'})`);
