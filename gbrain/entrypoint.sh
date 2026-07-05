#!/bin/sh
# Initialize the brain on first run (persisted in the mounted ~/.gbrain volume),
# then serve it over HTTP. Idempotent: re-runs reuse the existing brain.
set -e

: "${GBRAIN_PORT:=3131}"
GBRAIN_HOME="${HOME:-/root}/.gbrain"

# Convenience: the app already ships a Gemini AI Studio key as GEMINI_API_KEY.
# gbrain wants that same key under GOOGLE_GENERATIVE_AI_API_KEY for the `google`
# embedding provider (model gemini-embedding-001), so map it across.
if [ -z "$GOOGLE_GENERATIVE_AI_API_KEY" ] && [ -n "$GEMINI_API_KEY" ]; then
  export GOOGLE_GENERATIVE_AI_API_KEY="$GEMINI_API_KEY"
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
  echo "gbrain: set an embedding key — GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY (Gemini), or OPENAI_API_KEY / VOYAGE_API_KEY / ZEROENTROPY_API_KEY — in .env.local." >&2
  exit 1
fi

if [ ! -f "$GBRAIN_HOME/config.json" ]; then
  echo "gbrain: no brain found — initializing a local PGLite brain ($EMBED_MODEL)..." >&2
  gbrain init --pglite --embedding-model "$EMBED_MODEL"
fi

# PGLite is single-writer and does not release its lock on SIGKILL. We only ever
# run one gbrain container, so any lock present at container startup was written
# by a previous, now-dead process — clearing it avoids "Timed out waiting for
# PGLite lock" on restart. (postmaster.pid is the embedded Postgres equivalent.)
rm -f "$GBRAIN_HOME"/brain.pglite/.gbrain-lock/lock 2>/dev/null || true
rm -f "$GBRAIN_HOME"/brain.pglite/postmaster.pid 2>/dev/null || true

# Surface any config/DB/provider problems in the logs, but don't block startup.
gbrain doctor --fast || true

# Run the bridge, not `gbrain serve --http`: on PGLite only one process may own
# the brain, and the bridge needs to shell `gbrain put`/`gbrain query`. The
# bridge binds 0.0.0.0 (Bun default) so the container's published port reaches it.
exec bun /app/bridge.ts
