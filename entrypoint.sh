#!/bin/sh
set -e

# Ensure the data directory is owned by appuser
# This fixes EACCES errors when Docker mounts a host volume as root
chown -R appuser:appgroup /app/data

# Drop privileges and execute the CMD as appuser
exec su-exec appuser "$@"
