# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY blynk_backend/package*.json ./
COPY blynk_backend/tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY blynk_backend/src ./src
COPY blynk_backend/prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl openssl-dev

# Copy package files
COPY blynk_backend/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files and Prisma schema
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy frontend build files (built from root directory)
# Frontend dist folder should be built before Docker build
COPY dist ./public

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/index.js"]
