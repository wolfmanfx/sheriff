#!/bin/bash
# Script to start servers and run Playwright tests

set -e

echo "Starting servers..."

# Start backend if not running
if ! curl -s http://localhost:3000/api/agent/history/test-session > /dev/null 2>&1; then
  echo "Starting backend server..."
  yarn nx serve sheriff-api > /tmp/sheriff-api.log 2>&1 &
  BACKEND_PID=$!
  echo "Backend PID: $BACKEND_PID"
  
  # Wait for backend to be ready
  echo "Waiting for backend..."
  for i in {1..30}; do
    if curl -s http://localhost:3000/api/agent/history/test-session > /dev/null 2>&1; then
      echo "Backend is ready!"
      break
    fi
    sleep 2
  done
else
  echo "Backend already running on port 3000"
  BACKEND_PID=""
fi

# Start frontend if not running
if ! curl -s http://localhost:4200 > /dev/null 2>&1; then
  echo "Starting frontend server..."
  yarn nx serve sheriff-ui > /tmp/sheriff-ui.log 2>&1 &
  FRONTEND_PID=$!
  echo "Frontend PID: $FRONTEND_PID"
  
  # Wait for frontend to be ready
  echo "Waiting for frontend..."
  for i in {1..60}; do
    if curl -s http://localhost:4200 > /dev/null 2>&1; then
      echo "Frontend is ready!"
      break
    fi
    sleep 2
  done
else
  echo "Frontend already running on port 4200"
  FRONTEND_PID=""
fi

echo ""
echo "Running Playwright tests..."
yarn playwright test

# Cleanup: Only kill servers we started
if [ ! -z "$BACKEND_PID" ]; then
  echo "Stopping backend server (PID: $BACKEND_PID)..."
  kill $BACKEND_PID 2>/dev/null || true
fi

if [ ! -z "$FRONTEND_PID" ]; then
  echo "Stopping frontend server (PID: $FRONTEND_PID)..."
  kill $FRONTEND_PID 2>/dev/null || true
fi

echo "Done!"

