#!/bin/bash

# Define server URLs
JETPATH="http://localhost:3000"
ELYSIA="http://localhost:3001"

# --- Benchmark Configuration ---
# Warm-up phase: A small number of requests to get the server ready
WARMUP_REQUESTS=20000
WARMUP_CONCURRENCY=200

# Main benchmark: High concurrency test
BENCHMARK_REQUESTS=1000000  # Total number of requests
BENCHMARK_CONCURRENCY=1000  # Number of concurrent connections
# OR use duration instead of requests (uncomment the line below and comment BENCHMARK_REQUESTS)
# BENCHMARK_DURATION="30s" # Duration of the benchmark (e.g., 30s, 1m, 5m)


echo "--- Starting Benchmarks ---"
echo ""

# --- Benchmark JETPATH: $JETPATH ---
echo "Benchmarking JETPATH: $JETPATH"
echo "Starting warm-up ($WARMUP_REQUESTS requests, $WARMUP_CONCURRENCY concurrency)..."
oha -n $WARMUP_REQUESTS -c $WARMUP_CONCURRENCY $JETPATH > /dev/null # Warm-up output redirected to /dev/null
echo "Warm-up for $JETPATH complete."

# Choose between requests or duration for the main benchmark
if [ -z "$BENCHMARK_DURATION" ]; then
    echo "Starting main benchmark ($BENCHMARK_REQUESTS requests, $BENCHMARK_CONCURRENCY concurrency)..."
    oha -n $BENCHMARK_REQUESTS -c $BENCHMARK_CONCURRENCY $JETPATH
else
    echo "Starting main benchmark ($BENCHMARK_DURATION duration, $BENCHMARK_CONCURRENCY concurrency)..."
    oha -z $BENCHMARK_DURATION -c $BENCHMARK_CONCURRENCY $JETPATH
fi

echo "Main benchmark for $JETPATH complete."
echo ""

# --- Benchmark ELYSIA: $ELYSIA ---
echo "Benchmarking ELYSIA: $ELYSIA"
echo "Starting warm-up ($WARMUP_REQUESTS requests, $WARMUP_CONCURRENCY concurrency)..."
oha -n $WARMUP_REQUESTS -c $WARMUP_CONCURRENCY $ELYSIA > /dev/null # Warm-up output redirected to /dev/null
echo "Warm-up for $ELYSIA complete."

# Choose between requests or duration for the main benchmark
if [ -z "$BENCHMARK_DURATION" ]; then
    echo "Starting main benchmark ($BENCHMARK_REQUESTS requests, $BENCHMARK_CONCURRENCY concurrency)..."
    oha -n $BENCHMARK_REQUESTS -c $BENCHMARK_CONCURRENCY $ELYSIA
else
    echo "Starting main benchmark ($BENCHMARK_DURATION duration, $BENCHMARK_CONCURRENCY concurrency)..."
    oha -z $BENCHMARK_DURATION -c $BENCHMARK_CONCURRENCY $ELYSIA
fi

echo "Main benchmark for $ELYSIA complete."
echo ""

echo "--- Benchmarks Finished ---"
