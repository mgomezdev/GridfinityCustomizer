#!/bin/sh
set -e

# Start the Node.js backend in the background
node server/dist/index.js &

# Start nginx in the foreground
exec nginx -g 'daemon off;'
