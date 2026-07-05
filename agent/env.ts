import fs from 'node:fs';
import path from 'node:path';

/**
 * Load `.env.local` from the repo root into process.env (existing values win),
 * so the agent shares ANTHROPIC_API_KEY etc. with the Next.js app without extra
 * setup. Minimal parser — KEY=VALUE lines, `#` comments, optional quotes.
 */
export function loadEnv(): void {
  // Run via `pnpm agent` from the repo root (ESM scope — no __dirname).
  const file = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;

  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
