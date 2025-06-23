#!/bin/bash

# Stop Unstructured-IO Service

set -e

echo "🛑 Stopping Unstructured-IO Service..."

# Stop the service
docker-compose -f docker-compose.unstructured.yml down

echo "✅ Unstructured-IO service stopped"

# Optional: Remove the containers and volumes
read -p "🗑️  Remove containers and volumes? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose -f docker-compose.unstructured.yml down -v --remove-orphans
    echo "✅ Containers and volumes removed"
fi 