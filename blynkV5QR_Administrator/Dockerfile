# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Copy root src directory for UnifiedAuthContext (if needed)
RUN mkdir -p src/context && \
    if [ -f ../../src/context/UnifiedAuthContext.tsx ]; then \
        cp ../../src/context/UnifiedAuthContext.tsx src/context/; \
    fi

# Build the application
RUN npm run build

# Production stage - Nginx
FROM nginx:alpine

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html/admin

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
