#!/bin/sh
set -e

DB_PATH="${DB_PATH:-/data/gridfinity.db}"

# Seed database on first run (when DB file doesn't exist)
if [ ! -f "$DB_PATH" ]; then
  echo "First run detected — seeding database..."
  node server/dist/db/seed.js
  echo "Seed complete."
fi

# Start the server
exec node server/dist/index.js
