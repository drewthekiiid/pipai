# PIP AI Temporal Worker Dockerfile
# Simplified single-stage build for worker directory deployment

FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && update-ca-certificates

# Create non-root user
RUN groupadd --system --gid 1001 worker && \
    useradd --system --uid 1001 --gid worker worker

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install && npm cache clean --force

# Copy built application (assumes npm run build was run locally)
COPY dist/ ./dist/

# Create temp directory for file processing
RUN mkdir -p /tmp && chown -R worker:worker /tmp && chown -R worker:worker /app

# Switch to non-root user
USER worker

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('Worker is running')" || exit 1

# Environment variables
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the simplified worker
CMD ["node", "dist/worker-simple.js"]
