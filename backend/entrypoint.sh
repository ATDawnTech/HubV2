#!/bin/sh
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting application..."
if [ "$DEBUG" = "true" ]; then
    echo "Hot reload enabled"
    exec uvicorn src.adthub.main:app --host 0.0.0.0 --port 3001 --reload --reload-dir src
else
    exec uvicorn src.adthub.main:app --host 0.0.0.0 --port 3001
fi
