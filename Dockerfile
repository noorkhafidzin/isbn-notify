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

# Install su-exec for dropping privileges in entrypoint
RUN apk add --no-cache su-exec

# Copy raw static assets required at runtime
COPY --from=builder /app/src/ui.css ./src/ui.css
COPY --from=builder /app/src/ui.js ./src/ui.js
COPY icon.png ./icon.png

# Create non-root user and set permissions for /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app

# Copy entrypoint script
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 8787

# Entrypoint will fix volume permissions and drop to appuser
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "dist/index.js"]
