# Realtime collaboration server (Hocuspocus). In-memory, no auth.
FROM node:20-slim
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
ENV PORT=1234
EXPOSE 1234
CMD ["npm", "start"]
