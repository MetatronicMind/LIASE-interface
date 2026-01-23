#!/bin/sh
echo "--- Starting Startup Script ---"

# 1. Restore the hidden folder (The Trojan Horse Unpack)
if [ -d "_next_visible" ]; then
  echo "✅ Found '_next_visible' folder. Renaming it back to '.next'..."
  rm -rf .next
  mv _next_visible .next
else
  echo "⚠️ '_next_visible' folder not found. Checking if .next already exists..."
fi

# 2. Start the server
echo "🚀 Starting Server..."
node server.js