#!/bin/bash
# Load environment variables for PIP AI development

if [ -f .env ]; then
    echo "Loading environment variables from .env..."
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
    echo "✅ Environment variables loaded"
    echo "VERCEL_TOKEN: ${VERCEL_TOKEN:+SET}"
    echo "TEMPORAL_API_KEY: ${TEMPORAL_API_KEY:+SET}"
    echo "V0_API_KEY: ${V0_API_KEY:+SET}"
    echo "OPENAI_API_KEY: ${OPENAI_API_KEY:+SET}"
    echo "GITHUB_TOKEN: ${GITHUB_TOKEN:+SET}"
    echo "DATABASE_URL: ${DATABASE_URL:+SET}"
    echo "🚀 Ready for development!"
else
    echo "❌ .env file not found. Please copy .env.example to .env and fill in your values."
    echo "Run: cp .env.example .env"
fi
