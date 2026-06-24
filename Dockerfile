# Build context for this Dockerfile is the PROJECT ROOT (see docker-compose.yml:
# `build: { context: ., dockerfile: backend/Dockerfile }`).
#
# We mirror the same folder layout inside the image as exists on disk
# (backend/ and frontend/ as siblings) so that the relative path used in
# backend/src/app.js -- path.join(__dirname, '..', '..', 'frontend') --
# resolves correctly both when run locally AND inside this container.
FROM node:20-alpine

WORKDIR /app

COPY backend ./backend
COPY frontend ./frontend

WORKDIR /app/backend
RUN npm install --omit=dev

EXPOSE 4000

CMD ["node", "server.js"]
