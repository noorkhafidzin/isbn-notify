# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787
ENV DB_PATH=/app/data/books.json

COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled files from builder
COPY --from=builder /app/dist ./dist
# Copy raw static assets required at runtime
COPY --from=builder /app/src/ui.css ./src/ui.css
COPY --from=builder /app/src/ui.js ./src/ui.js

# Run as non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && mkdir -p /app/data \
    && chown -R appuser:appgroup /app
USER appuser

EXPOSE 8787

# Run the app
CMD ["node", "dist/index.js"]
