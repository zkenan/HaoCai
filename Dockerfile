FROM node:18-slim AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ .
RUN npm run build

FROM node:18-slim AS backend-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci

FROM node:18-slim
WORKDIR /app
COPY server/ ./server/
COPY --from=frontend-builder /app/server/public/ ./server/public/
COPY --from=backend-builder /app/server/node_modules ./server/node_modules/
RUN mkdir -p uploads/backups
WORKDIR /app/server
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"
CMD ["node", "app.js"]
