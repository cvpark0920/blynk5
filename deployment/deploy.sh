#!/bin/bash

# Blynk Platform Deployment Script
# This script deploys backend and frontend applications to DigitalOcean Droplet

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="/opt/blynk-backend"
FRONTEND_DIR="/var/www/blynk-platform"
NGINX_CONFIG="/etc/nginx/sites-available/blynk-platform"
NGINX_ENABLED="/etc/nginx/sites-enabled/blynk-platform"
DEPLOY_DIR="/tmp/blynk-deploy"
BACKUP_DIR="/opt/blynk-backups"

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    error "Please run as root (use sudo)"
    exit 1
fi

log "Starting deployment..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup current frontend (if exists)
if [ -d "$FRONTEND_DIR" ]; then
    log "Backing up current frontend..."
    BACKUP_NAME="frontend-$(date +%Y%m%d-%H%M%S).tar.gz"
    tar -czf "$BACKUP_DIR/$BACKUP_NAME" -C "$FRONTEND_DIR" . 2>/dev/null || true
    log "Frontend backed up to $BACKUP_DIR/$BACKUP_NAME"
fi

# Extract frontend build
if [ -f "$DEPLOY_DIR/frontend-build.tar.gz" ]; then
    log "Extracting frontend build..."
    mkdir -p "$FRONTEND_DIR"
    tar -xzf "$DEPLOY_DIR/frontend-build.tar.gz" -C "$FRONTEND_DIR"
    
    # Set proper permissions
    chown -R www-data:www-data "$FRONTEND_DIR"
    chmod -R 755 "$FRONTEND_DIR"
    log "Frontend extracted successfully"
else
    warning "Frontend build archive not found, skipping frontend deployment"
fi

# Deploy backend (Docker Compose)
if [ -d "$BACKEND_DIR" ]; then
    log "Deploying backend..."
    cd "$BACKEND_DIR"
    
    # Pull latest Docker image
    docker-compose -f docker-compose.prod.yml pull backend || warning "Failed to pull backend image"
    
    # Restart backend container
    docker-compose -f docker-compose.prod.yml up -d --no-deps backend || error "Failed to start backend"
    
    # Wait for backend to be healthy
    log "Waiting for backend to be healthy..."
    sleep 10
    
    # Run database migrations
    log "Running database migrations..."
    docker-compose -f docker-compose.prod.yml exec -T backend npm run prisma:migrate deploy || warning "Migration failed or no migrations to run"
    
    log "Backend deployed successfully"
else
    warning "Backend directory not found, skipping backend deployment"
fi

# Deploy Nginx configuration
if [ -f "$DEPLOY_DIR/nginx.conf" ]; then
    log "Deploying Nginx configuration..."
    
    # Backup existing config
    if [ -f "$NGINX_CONFIG" ]; then
        cp "$NGINX_CONFIG" "$NGINX_CONFIG.backup.$(date +%Y%m%d-%H%M%S)"
    fi
    
    # Copy new config
    cp "$DEPLOY_DIR/nginx.conf" "$NGINX_CONFIG"
    
    # Create symlink if it doesn't exist
    if [ ! -L "$NGINX_ENABLED" ]; then
        ln -s "$NGINX_CONFIG" "$NGINX_ENABLED"
    fi
    
    # Test Nginx configuration
    if nginx -t; then
        log "Nginx configuration is valid"
        systemctl reload nginx || systemctl restart nginx
        log "Nginx reloaded successfully"
    else
        error "Nginx configuration test failed, reverting..."
        if [ -f "$NGINX_CONFIG.backup.$(date +%Y%m%d-%H%M%S)" ]; then
            # Find latest backup
            LATEST_BACKUP=$(ls -t "$NGINX_CONFIG.backup."* 2>/dev/null | head -1)
            if [ -n "$LATEST_BACKUP" ]; then
                cp "$LATEST_BACKUP" "$NGINX_CONFIG"
                nginx -t && systemctl reload nginx
            fi
        fi
        exit 1
    fi
else
    warning "Nginx configuration not found, skipping Nginx deployment"
fi

# Cleanup old backups (keep last 5)
log "Cleaning up old backups..."
ls -t "$BACKUP_DIR"/frontend-*.tar.gz 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true

# Cleanup Docker
log "Cleaning up Docker..."
docker system prune -f --volumes || true

# Health check
log "Performing health check..."
sleep 5

# Check backend health
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    log "Backend health check passed"
else
    error "Backend health check failed"
    exit 1
fi

# Check Nginx
if systemctl is-active --quiet nginx; then
    log "Nginx is running"
else
    error "Nginx is not running"
    exit 1
fi

log "Deployment completed successfully!"

# Display service status
echo ""
log "Service Status:"
docker-compose -f "$BACKEND_DIR/docker-compose.prod.yml" ps
systemctl status nginx --no-pager -l | head -10
