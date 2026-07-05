# Realtime collaboration server (Hocuspocus). In-memory, no auth.
# Node 22: @supabase/supabase-js's realtime client needs a native WebSocket,
# which Node 20 lacks (createClient throws "native WebSocket not found").
FROM node:22-slim
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
ENV PORT=1234
EXPOSE 1234
CMD ["npm", "start"]
