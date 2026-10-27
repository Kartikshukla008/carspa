#!/usr/bin/env bash
set -e

echo "==> Running database migrations..."
python manage.py migrate --no-input

echo "==> Seeding initial CarSpa data..."
python manage.py seed_data

echo "==> Starting Gunicorn production server..."
exec gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000}
