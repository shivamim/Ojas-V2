#!/bin/bash
set -e

# Safe cd — only if we're at repo root
if [ -d "backend" ]; then
    cd backend
fi

echo "=== Starting Ojas Backend ==="

# All DB setup is now handled by main.py lifespan — just start uvicorn
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1
