#!/usr/bin/env bash
set -e

echo "==> Running database migrations..."
python manage.py migrate --no-input

echo "==> Seeding initial CarSpa data..."
python manage.py seed_data

echo "==> Starting Daphne ASGI server (HTTP + WebSockets)..."
exec daphne -b 0.0.0.0 -p ${PORT:-8000} config.asgi:application
