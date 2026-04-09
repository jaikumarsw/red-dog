#!/bin/bash
set -e

# Start MongoDB in background
mkdir -p /home/runner/workspace/data/db
mongod --dbpath /home/runner/workspace/data/db --logpath /tmp/mongod.log --fork --quiet

echo "MongoDB started"

# Start backend in background
cd red-dog-radios-backend
npm start &
BACKEND_PID=$!
echo "Backend started (PID: $BACKEND_PID)"

cd ..

# Start frontend on port 5000
cd red-dog-radios-frontend
npm run dev -- -p 5000 -H 0.0.0.0
