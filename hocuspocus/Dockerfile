# Realtime collaboration server (Hocuspocus). In-memory, no auth.
FROM node:22-slim
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
ENV PORT=1234
EXPOSE 1234
# Recall.ai transcript webhook (RECALL_PORT, default PORT+1).
EXPOSE 1235
CMD ["npm", "start"]
