# gbrain sidecar — Garry Tan's agent brain, run as a local HTTP MCP server.
#   https://github.com/garrytan/gbrain
#
# The image only installs the gbrain CLI. The brain itself is initialized at
# runtime by entrypoint.sh with a real embedding provider (`gbrain init --pglite
# --embedding-model <provider>` — embedding is ON, not --no-embedding), so the
# provider key can be a runtime secret and the brain persists in the mounted
# ~/.gbrain volume. See gbrain's headless-install docs, "deferred-setup" pattern.
FROM oven/bun:1

# git: gbrain installs from GitHub and syncs markdown via git.
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN bun install -g github:garrytan/gbrain

# The bridge (HTTP wrapper over the gbrain CLI) is the sole owner of the PGLite
# brain — see bridge.ts for why we don't run `gbrain serve --http` locally.
COPY bridge.ts /app/bridge.ts
COPY entrypoint.sh /usr/local/bin/gbrain-entrypoint.sh
RUN chmod +x /usr/local/bin/gbrain-entrypoint.sh

# gbrain bridge HTTP API (/health, /write, /query).
EXPOSE 3131

ENTRYPOINT ["/usr/local/bin/gbrain-entrypoint.sh"]
