#!/bin/bash

# Monitor Unstructured-IO 24/7 Service Status
# Comprehensive monitoring and health checking

set -e

echo "📊 Unstructured-IO 24/7 Service Monitor"
echo "=========================================="

# Function to check service health
check_health() {
    local url="http://localhost:8000/healthcheck"
    if curl -s -f "$url" > /dev/null 2>&1; then
        echo "✅ Service is healthy"
        return 0
    else
        echo "❌ Service is unhealthy"
        return 1
    fi
}

# Function to get uptime
get_uptime() {
    local container_name="$1"
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "$container_name"; then
        local status=$(docker ps --format "{{.Status}}" --filter "name=$container_name")
        echo "🕐 Uptime: $status"
    else
        echo "💀 Container not running"
    fi
}

# Function to get resource usage
get_resources() {
    local container_name="$1"
    if docker ps --format "{{.Names}}" | grep -q "$container_name"; then
        echo "💾 Resource Usage:"
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" "$container_name"
    fi
}

# Check which version is running
echo ""
echo "🔍 Service Detection:"
if docker ps | grep -q "unstructured-api-prod"; then
    CONTAINER_NAME="unstructured-api-prod"
    SERVICE_TYPE="Production (24/7)"
    COMPOSE_FILE="docker-compose.unstructured.production.yml"
elif docker ps | grep -q "unstructured-api"; then
    CONTAINER_NAME="unstructured-api"
    SERVICE_TYPE="Development"
    COMPOSE_FILE="docker-compose.unstructured.yml"
else
    echo "❌ No Unstructured-IO service detected"
    echo ""
    echo "🚀 Start Options:"
    echo "  • Development: ./start-unstructured.sh"
    echo "  • Production (24/7): ./start-unstructured-production.sh"
    exit 1
fi

echo "📦 Service Type: $SERVICE_TYPE"
echo "🐳 Container: $CONTAINER_NAME"

# Service Status
echo ""
echo "🏥 Health Status:"
check_health

# Uptime Information
echo ""
echo "⏰ Uptime Information:"
get_uptime "$CONTAINER_NAME"

# Resource Usage
echo ""
get_resources "$CONTAINER_NAME"

# Recent logs (last 10 lines)
echo ""
echo "📋 Recent Logs (last 10 lines):"
echo "----------------------------------------"
docker-compose -f "$COMPOSE_FILE" logs --tail 10 2>/dev/null || echo "Unable to fetch logs"

# Network connectivity
echo ""
echo "🌐 Network Status:"
if nc -z localhost 8000 2>/dev/null; then
    echo "✅ Port 8000 is accessible"
else
    echo "❌ Port 8000 is not accessible"
fi

# 24/7 Configuration Check (for production)
if [ "$SERVICE_TYPE" = "Production (24/7)" ]; then
    echo ""
    echo "🔧 24/7 Configuration:"
    
    # Check restart policy
    restart_policy=$(docker inspect "$CONTAINER_NAME" --format '{{.HostConfig.RestartPolicy.Name}}' 2>/dev/null || echo "unknown")
    echo "🔄 Restart Policy: $restart_policy"
    
    # Check health check configuration
    health_config=$(docker inspect "$CONTAINER_NAME" --format '{{.Config.Healthcheck}}' 2>/dev/null || echo "not configured")
    if [ "$health_config" != "not configured" ] && [ "$health_config" != "<no value>" ]; then
        echo "❤️ Health Checks: ✅ Configured"
    else
        echo "❤️ Health Checks: ❌ Not configured"
    fi
    
    # Check if Watchtower is running
    if docker ps | grep -q "unstructured-watchtower"; then
        echo "🔄 Auto-updates: ✅ Watchtower running"
    else
        echo "🔄 Auto-updates: ⚠️ Watchtower not running"
    fi
fi

# Service endpoints
echo ""
echo "🔗 Service Endpoints:"
echo "  • API: http://localhost:8000"
echo "  • Health: http://localhost:8000/healthcheck"
echo "  • Docs: http://localhost:8000/docs"

# Management commands
echo ""
echo "🛠️ Management Commands:"
echo "  • View live logs: docker-compose -f $COMPOSE_FILE logs -f"
echo "  • Restart service: docker-compose -f $COMPOSE_FILE restart"
echo "  • Stop service: docker-compose -f $COMPOSE_FILE down"
if [ "$SERVICE_TYPE" = "Production (24/7)" ]; then
    echo "  • Update service: docker-compose -f $COMPOSE_FILE pull && docker-compose -f $COMPOSE_FILE up -d"
fi

# Quick actions menu
echo ""
echo "🎯 Quick Actions:"
echo "1) View live logs"
echo "2) Check detailed health"
echo "3) Restart service"
echo "4) Show resource usage (live)"
echo "5) Exit"

read -p "Choose action (1-5): " action

case $action in
    1)
        echo "📋 Live logs (Ctrl+C to exit):"
        docker-compose -f "$COMPOSE_FILE" logs -f
        ;;
    2)
        echo "🔍 Detailed Health Check:"
        curl -v http://localhost:8000/healthcheck 2>&1 || echo "Health check failed"
        ;;
    3)
        echo "🔄 Restarting service..."
        docker-compose -f "$COMPOSE_FILE" restart
        echo "✅ Service restarted"
        ;;
    4)
        echo "📊 Live resource usage (Ctrl+C to exit):"
        docker stats "$CONTAINER_NAME"
        ;;
    5)
        echo "👋 Goodbye!"
        ;;
    *)
        echo "Invalid option"
        ;;
esac 