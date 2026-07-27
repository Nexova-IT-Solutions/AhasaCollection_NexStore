#!/bin/bash
echo "Stopping existing next dev server..."
pkill -f "next dev" || true
pkill -f "next-server" || true
pkill -f "node.*next" || true
sleep 2

echo "Starting next dev server..."
cd /run/media/sharadamarasinghe/01DCB46A126F9D70/gitboxlk/giftboxlk
nohup npm run dev > dev_restart.log 2>&1 &

echo "Waiting for port 3000..."
for i in {1..30}; do
  if curl -s http://localhost:3000 > /dev/null; then
    echo "Server is UP!"
    exit 0
  fi
  sleep 1
done

echo "Timeout waiting for dev server"
exit 1
