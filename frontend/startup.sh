#!/bin/sh
echo "--- Starting Startup Script ---"
echo "Current Directory: $(pwd)"
ls -la

# 1. Restore the hidden folder (The Trojan Horse Unpack)
# Using 'next_build_visible' to avoid any underscore ignore rules
if [ -d "next_build_visible" ]; then
  echo "✅ Found 'next_build_visible' folder."
  
  if [ -d ".next" ]; then
    echo "Found existing .next folder. Removing it..."
    rm -rf .next
  fi
  
  echo "Renaming 'next_build_visible' to '.next'..."
  mv next_build_visible .next
else
  echo "⚠️ 'next_build_visible' folder not found."
  echo "Checking if .next already exists..."
  if [ -d ".next" ]; then
    echo "✅ .next folder exists."
  else
    echo "❌ CRITICAL: Neither 'next_build_visible' nor '.next' found."
  fi
fi

# 2. Start the server
echo "🚀 Starting Server..."
node server.js