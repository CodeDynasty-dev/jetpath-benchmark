#!/bin/bash
# Benchmark script for macOS - distributes requests across workers

WORKERS=${1:-$(sysctl -n hw.ncpu)}
BASE_PORT=${2:-3000}

echo "=== Jetpath Cluster Benchmark ==="
echo "Workers: $WORKERS"
echo "Base Port: $BASE_PORT"
echo ""

echo "Starting cluster..."
bun src/index.jet.ts 2>&1 &
CLUSTER_PID=$!
sleep 3

echo ""
echo "Available worker endpoints:"
for i in $(seq 0 $((WORKERS - 1))); do
  PORT=$((BASE_PORT + i))
  echo "  Worker $i: http://localhost:$PORT/"
done

echo ""
echo "Run benchmark against all workers:"
for i in $(seq 0 $((WORKERS - 1))); do
  PORT=$((BASE_PORT + i))
  echo "=== Worker $i (port $PORT) ==="
  # Use hey or ab if available, otherwise curl
  if command -v hey &> /dev/null; then
    hey -n 10000 -c 100 http://localhost:$PORT/ 2>&1 | tail -5
  elif command -v ab &> /dev/null; then
    ab -n 10000 -c 100 http://localhost:$PORT/
  else
    echo "Install 'hey' for benchmarking: go install github.com/rakyll/hey@latest"
    echo "Quick test:"
    time curl -s -o /dev/null http://localhost:$PORT/
  fi
  echo ""
done

echo "Stopping cluster..."
kill $CLUSTER_PID 2>/dev/null
wait $CLUSTER_PID 2>/dev/null

echo "Done."
