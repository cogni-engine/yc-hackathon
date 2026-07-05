#!/bin/sh
# Initialize the brain on first run, then run the bridge over HTTP.
#
# Two modes, chosen by whether a Postgres URL is present:
#   - GBRAIN_DATABASE_URL / DATABASE_URL set  → Postgres (prod, e.g. Supabase).
#     Shared DB, concurrent access is fine.
#   - neither set                             → local PGLite (single-writer).
set -e

: "${GBRAIN_PORT:=3131}"
GBRAIN_HOME="${HOME:-/root}/.gbrain"

# Convenience: the app already ships a Gemini AI Studio key as GEMINI_API_KEY.
# gbrain wants that same key under GOOGLE_GENERATIVE_AI_API_KEY for the `google`
# embedding provider (model gemini-embedding-001), so map it across.
if [ -z "$GOOGLE_GENERATIVE_AI_API_KEY" ] && [ -n "$GEMINI_API_KEY" ]; then
  export GOOGLE_GENERATIVE_AI_API_KEY="$GEMINI_API_KEY"
fi

# gbrain namespaces its connection string as GBRAIN_DATABASE_URL and deliberately
# ignores a bare DATABASE_URL that came from a cwd .env (its #427 guard). We map
# DATABASE_URL → GBRAIN_DATABASE_URL so a plain Render/compose env var works.
if [ -z "$GBRAIN_DATABASE_URL" ] && [ -n "$DATABASE_URL" ]; then
  export GBRAIN_DATABASE_URL="$DATABASE_URL"
fi

# Pick the embedding provider explicitly so a non-TTY init never stalls on the
# multi-key interactive picker. Override with GBRAIN_EMBEDDING_MODEL.
if [ -n "$GBRAIN_EMBEDDING_MODEL" ]; then
  EMBED_MODEL="$GBRAIN_EMBEDDING_MODEL"
elif [ -n "$GOOGLE_GENERATIVE_AI_API_KEY" ]; then
  EMBED_MODEL="google:gemini-embedding-001"
elif [ -n "$OPENAI_API_KEY" ]; then
  EMBED_MODEL="openai:text-embedding-3-large"
elif [ -n "$VOYAGE_API_KEY" ]; then
  EMBED_MODEL="voyage:voyage-4"
elif [ -n "$ZEROENTROPY_API_KEY" ]; then
  EMBED_MODEL="zeroentropyai:zerank-2"
else
  echo "gbrain: set an embedding key — GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY (Gemini), or OPENAI_API_KEY / VOYAGE_API_KEY / ZEROENTROPY_API_KEY." >&2
  exit 1
fi

if [ -n "$GBRAIN_DATABASE_URL" ]; then
  # ---- Postgres mode (prod / Supabase) ----------------------------------
  # Concurrent access is fine here, so there is no PGLite lock to manage. Keep
  # ~/.gbrain on a persistent disk (see render.yaml) so config.json survives and
  # init only runs once; otherwise it re-runs each boot (apply-migrations is
  # idempotent, so schema stays intact either way).
  if [ ! -f "$GBRAIN_HOME/config.json" ]; then
    echo "gbrain: initializing Postgres brain ($EMBED_MODEL)..." >&2
    gbrain init --non-interactive --embedding-model "$EMBED_MODEL"
  fi
  echo "gbrain: applying migrations..." >&2
  gbrain apply-migrations --yes || true
else
  # ---- PGLite mode (local dev) ------------------------------------------
  if [ ! -f "$GBRAIN_HOME/config.json" ]; then
    echo "gbrain: initializing local PGLite brain ($EMBED_MODEL)..." >&2
    gbrain init --pglite --embedding-model "$EMBED_MODEL"
  fi
  # PGLite is single-writer and does not release its lock on SIGKILL. We only
  # ever run one gbrain container, so any lock present at startup was left by a
  # previous, now-dead process — clearing it avoids "Timed out waiting for
  # PGLite lock" on restart. (postmaster.pid is the embedded Postgres equivalent.)
  rm -f "$GBRAIN_HOME"/brain.pglite/.gbrain-lock/lock 2>/dev/null || true
  rm -f "$GBRAIN_HOME"/brain.pglite/postmaster.pid 2>/dev/null || true
fi

# Surface any config/DB/provider problems in the logs, but don't block startup.
gbrain doctor --fast || true

# Run the bridge (not `gbrain serve --http`): the bridge shells `gbrain put` /
# `gbrain query`, and on PGLite only one process may own the brain. It binds
# 0.0.0.0 and honors $PORT (Render), else GBRAIN_PORT, else 3131.
exec bun /app/bridge.ts
