#!/bin/bash

# Debug startup script for Wakati API
echo "🔍 Wakati API Debug Startup Script"
echo "===================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found! Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env from .env.example"
        echo "⚠️  Please edit .env with your actual values before continuing"
        exit 1
    else
        echo "❌ .env.example not found either!"
        exit 1
    fi
fi

# Source environment variables
echo "📋 Loading environment variables..."
set -a
source .env
set +a

# Check critical environment variables
echo "🔍 Checking critical environment variables..."
check_env_var() {
    if [ -z "${!1}" ]; then
        echo "❌ $1 is not set"
        return 1
    else
        echo "✅ $1 is set"
        return 0
    fi
}

missing_vars=0

# Critical variables
check_env_var "DATABASE_URL" || ((missing_vars++))
check_env_var "PORT" || ((missing_vars++))
check_env_var "SYSTEM" || ((missing_vars++))
check_env_var "PRODUCT" || ((missing_vars++))

echo ""
echo "🔍 Optional variables (may cause warnings):"
check_env_var "INNGEST_API_KEY"
check_env_var "SUPABASE_URL" 
check_env_var "SUPABASE_ANON_KEY"

if [ $missing_vars -gt 0 ]; then
    echo ""
    echo "❌ $missing_vars critical environment variables are missing!"
    echo "Please update your .env file before continuing."
    exit 1
fi

echo ""
echo "🔍 Checking dependencies..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ node_modules not found! Installing dependencies..."
    pnpm install
fi

# Check if database is accessible (basic connection test)
echo "🔍 Testing database connection..."
if command -v psql &> /dev/null; then
    if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
        echo "✅ Database connection successful"
    else
        echo "❌ Database connection failed"
        echo "Please check your DATABASE_URL and ensure PostgreSQL is running"
        echo "Current DATABASE_URL: $DATABASE_URL"
    fi
else
    echo "⚠️  psql not found, skipping database connection test"
fi

echo ""
echo "🚀 Starting application in debug mode..."
echo "Environment: ${NODE_ENV:-development}"
echo "Port: ${PORT:-8080}"
echo ""

# Set debug environment variables
export DEBUG="*"
export NODE_ENV="${NODE_ENV:-development}"

# Start the application with verbose logging
pnpm run start:debug
