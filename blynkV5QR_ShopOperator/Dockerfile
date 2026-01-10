# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY blynkV5QR_ShopOperator/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code and root src directory
COPY blynkV5QR_ShopOperator/ ./
COPY src/ ./src/

# Build the application
RUN npm run prebuild && npm run build

# Production stage - Nginx
FROM nginx:alpine

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html/shop

# Copy Nginx configuration
COPY blynkV5QR_ShopOperator/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
