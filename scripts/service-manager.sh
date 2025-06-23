#!/bin/bash

# 🎯 PIP AI Service Manager
# Graceful start, stop, and status management for all services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
UNSTRUCTURED_COMPOSE_FILE="$PROJECT_ROOT/docker-compose.unstructured.yml"
PID_DIR="$PROJECT_ROOT/.pids"
LOG_DIR="$PROJECT_ROOT/logs"

# Create directories
mkdir -p "$PID_DIR" "$LOG_DIR"

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Health check functions
check_unstructured_health() {
    curl -f -s http://localhost:8000/healthcheck > /dev/null 2>&1
}

check_worker_health() {
    [ -f "$PID_DIR/worker.pid" ] && kill -0 "$(cat "$PID_DIR/worker.pid")" 2>/dev/null
}

check_web_health() {
    curl -f -s http://localhost:3000 > /dev/null 2>&1
}

# Service status
show_status() {
    echo
    echo "🔍 PIP AI Service Status"
    echo "========================"
    
    # Unstructured Service
    if check_unstructured_health; then
        success "Unstructured Service: Running (http://localhost:8000)"
    else
        error "Unstructured Service: Not running"
    fi
    
    # Worker Service
    if check_worker_health; then
        success "Worker Service: Running (PID: $(cat "$PID_DIR/worker.pid" 2>/dev/null || echo "unknown"))"
    else
        error "Worker Service: Not running"
    fi
    
    # Web Service
    if check_web_health; then
        success "Web Service: Running (http://localhost:3000)"
    else
        error "Web Service: Not running"
    fi
    
    echo
}

# Start Unstructured service
start_unstructured() {
    log "Starting Unstructured service..."
    
    if check_unstructured_health; then
        warning "Unstructured service is already running"
        return 0
    fi
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running. Please start Docker Desktop first."
        return 1
    fi
    
    # Start with Docker Compose
    cd "$PROJECT_ROOT"
    log "Pulling latest Unstructured image..."
    docker pull downloads.unstructured.io/unstructured-io/unstructured:latest > "$LOG_DIR/unstructured-pull.log" 2>&1
    
    log "Starting Unstructured container..."
    docker-compose -f "$UNSTRUCTURED_COMPOSE_FILE" up -d > "$LOG_DIR/unstructured-start.log" 2>&1
    
    # Wait for service to be ready
    log "Waiting for Unstructured service to be ready..."
    for i in {1..60}; do
        if check_unstructured_health; then
            success "Unstructured service is ready!"
            return 0
        fi
        
        if [ $((i % 10)) -eq 0 ]; then
            log "Still waiting... ($i/60 seconds)"
        fi
        sleep 1
    done
    
    error "Unstructured service failed to start within 60 seconds"
    log "Check logs: docker-compose -f $UNSTRUCTURED_COMPOSE_FILE logs"
    return 1
}

# Stop Unstructured service
stop_unstructured() {
    log "Stopping Unstructured service..."
    
    if ! check_unstructured_health; then
        warning "Unstructured service is not running"
        return 0
    fi
    
    cd "$PROJECT_ROOT"
    docker-compose -f "$UNSTRUCTURED_COMPOSE_FILE" down > "$LOG_DIR/unstructured-stop.log" 2>&1
    
    # Wait for graceful shutdown
    for i in {1..10}; do
        if ! check_unstructured_health; then
            success "Unstructured service stopped gracefully"
            return 0
        fi
        sleep 1
    done
    
    warning "Unstructured service may not have stopped cleanly"
    return 0
}

# Start Worker service
start_worker() {
    log "Starting Worker service..."
    
    if check_worker_health; then
        warning "Worker service is already running"
        return 0
    fi
    
    # Ensure unstructured is running first
    if ! check_unstructured_health; then
        log "Unstructured service not ready - starting it first..."
        start_unstructured || return 1
    fi
    
    cd "$PROJECT_ROOT/packages/worker"
    
    # Build if needed
    if [ ! -d "dist" ] || [ ! -f "dist/worker.js" ]; then
        log "Building worker..."
        npm run build > "$LOG_DIR/worker-build.log" 2>&1
    fi
    
    # Start worker in background
    log "Starting worker process..."
    nohup npm start > "$LOG_DIR/worker.log" 2>&1 &
    WORKER_PID=$!
    echo $WORKER_PID > "$PID_DIR/worker.pid"
    
    # Wait for worker to initialize
    sleep 5
    
    if check_worker_health; then
        success "Worker service started (PID: $WORKER_PID)"
        return 0
    else
        error "Worker service failed to start"
        rm -f "$PID_DIR/worker.pid"
        return 1
    fi
}

# Stop Worker service
stop_worker() {
    log "Stopping Worker service..."
    
    if [ ! -f "$PID_DIR/worker.pid" ]; then
        warning "Worker PID file not found"
        return 0
    fi
    
    WORKER_PID=$(cat "$PID_DIR/worker.pid")
    
    if ! kill -0 "$WORKER_PID" 2>/dev/null; then
        warning "Worker process not running"
        rm -f "$PID_DIR/worker.pid"
        return 0
    fi
    
    # Graceful shutdown
    log "Sending SIGTERM to worker process..."
    kill -TERM "$WORKER_PID" 2>/dev/null || true
    
    # Wait for graceful shutdown
    for i in {1..10}; do
        if ! kill -0 "$WORKER_PID" 2>/dev/null; then
            success "Worker service stopped gracefully"
            rm -f "$PID_DIR/worker.pid"
            return 0
        fi
        sleep 1
    done
    
    # Force kill if needed
    warning "Worker didn't stop gracefully, forcing shutdown..."
    kill -KILL "$WORKER_PID" 2>/dev/null || true
    rm -f "$PID_DIR/worker.pid"
    success "Worker service stopped (forced)"
    return 0
}

# Start Web service
start_web() {
    log "Starting Web service..."
    
    if check_web_health; then
        warning "Web service is already running"
        return 0
    fi
    
    cd "$PROJECT_ROOT/apps/web"
    
    # Start in background
    log "Starting Next.js development server..."
    nohup npm run dev > "$LOG_DIR/web.log" 2>&1 &
    WEB_PID=$!
    echo $WEB_PID > "$PID_DIR/web.pid"
    
    # Wait for web server to start
    log "Waiting for web server to be ready..."
    for i in {1..30}; do
        if check_web_health; then
            success "Web service started (PID: $WEB_PID)"
            return 0
        fi
        sleep 2
    done
    
    error "Web service failed to start within 60 seconds"
    rm -f "$PID_DIR/web.pid"
    return 1
}

# Stop Web service
stop_web() {
    log "Stopping Web service..."
    
    if [ ! -f "$PID_DIR/web.pid" ]; then
        warning "Web PID file not found"
        return 0
    fi
    
    WEB_PID=$(cat "$PID_DIR/web.pid")
    
    if ! kill -0 "$WEB_PID" 2>/dev/null; then
        warning "Web process not running"
        rm -f "$PID_DIR/web.pid"
        return 0
    fi
    
    # Graceful shutdown
    kill -TERM "$WEB_PID" 2>/dev/null || true
    
    # Wait for graceful shutdown
    for i in {1..10}; do
        if ! kill -0 "$WEB_PID" 2>/dev/null; then
            success "Web service stopped gracefully"
            rm -f "$PID_DIR/web.pid"
            return 0
        fi
        sleep 1
    done
    
    # Force kill if needed
    warning "Web service didn't stop gracefully, forcing shutdown..."
    kill -KILL "$WEB_PID" 2>/dev/null || true
    rm -f "$PID_DIR/web.pid"
    success "Web service stopped (forced)"
    return 0
}

# Start all services
start_all() {
    echo
    echo "🚀 Starting PIP AI Services"
    echo "============================"
    
    start_unstructured || return 1
    start_worker || return 1
    
    echo
    success "Core services started successfully!"
    log "You can now:"
    log "  • Process documents with parallel processing"
    log "  • Use the Worker for Temporal workflows"
    log "  • Test with: node test-wen-parallel.mjs"
    
    show_status
}

# Stop all services
stop_all() {
    echo
    echo "🛑 Stopping PIP AI Services"
    echo "============================"
    
    stop_web
    stop_worker
    stop_unstructured
    
    # Cleanup
    log "Cleaning up temporary files..."
    rm -f "$PID_DIR"/*.pid
    
    success "All services stopped gracefully!"
    echo
}

# Restart all services
restart_all() {
    echo
    echo "🔄 Restarting PIP AI Services"
    echo "=============================="
    
    stop_all
    sleep 2
    start_all
}

# Show help
show_help() {
    echo
    echo "🎯 PIP AI Service Manager"
    echo "========================="
    echo
    echo "USAGE:"
    echo "  $0 [COMMAND]"
    echo
    echo "COMMANDS:"
    echo "  start           Start all core services (unstructured + worker)"
    echo "  stop            Stop all services gracefully"
    echo "  restart         Restart all services"
    echo "  status          Show service status"
    echo
    echo "  start-unstructured    Start only Unstructured service"
    echo "  stop-unstructured     Stop only Unstructured service"
    echo "  start-worker          Start only Worker service"
    echo "  stop-worker           Stop only Worker service"
    echo "  start-web             Start only Web service"
    echo "  stop-web              Stop only Web service"
    echo
    echo "EXAMPLES:"
    echo "  $0 start         # Start core services for document processing"
    echo "  $0 status        # Check what's running"
    echo "  $0 restart       # Restart everything"
    echo
    echo "LOGS:"
    echo "  Service logs are stored in: $LOG_DIR/"
    echo "  PID files are stored in: $PID_DIR/"
    echo
}

# Main command handler
case "${1:-help}" in
    "start")
        start_all
        ;;
    "stop")
        stop_all
        ;;
    "restart")
        restart_all
        ;;
    "status")
        show_status
        ;;
    "start-unstructured")
        start_unstructured
        ;;
    "stop-unstructured")
        stop_unstructured
        ;;
    "start-worker")
        start_worker
        ;;
    "stop-worker")
        stop_worker
        ;;
    "start-web")
        start_web
        ;;
    "stop-web")
        stop_web
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac 