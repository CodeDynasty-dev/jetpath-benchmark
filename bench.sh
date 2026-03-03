#!/bin/bash
set -euo pipefail

# =============================================================================
#  Jetpath vs ElysiaJS vs Bun.serve Benchmark
# =============================================================================
#  A rigorous, reproducible benchmark harness.
#
#  Methodology:
#    1. One server at a time — no resource contention between frameworks
#    2. Health-check before any load — confirms the server is truly ready
#    3. JIT warm-up at low concurrency — primes V8/JSC optimiser paths
#    4. Main run with hardware-appropriate concurrency
#    5. Cooldown between runs — clears OS socket buffers & thermals
#    6. JSON results captured for reproducible comparison
#
#  System target:  Intel i7-9750H (12 threads), 32 GB RAM, macOS
# =============================================================================

# ── Configuration ────────────────────────────────────────────────────────────

# Concurrency: 256 saturates 12 threads without overwhelming the kernel's
# socket-accept queue.  Going higher (1k–10k) measures OS scheduling overhead,
# not framework performance.
CONCURRENCY=256

# Duration-based benchmark — more stable than request-count on a laptop where
# turbo-boost / thermal throttling mean the same request count can take
# wildly different wall-clock times.
DURATION="30s"

# Warm-up: low concurrency, enough requests to trigger JIT tier-up in Bun/V8.
WARMUP_REQUESTS=10000
WARMUP_CONCURRENCY=50

# Cooldown between benchmark runs (seconds).
# Lets TCP TIME_WAIT sockets expire, thermals settle, and OS buffers reclaim.
COOLDOWN=5

# Number of benchmark rounds per framework (for statistical confidence).
ROUNDS=3

# Where to write JSON results.
RESULTS_DIR="./results"

# Server definitions: name, start command, port
declare -a SERVER_NAMES=("jetpath" "elysia" "bun")
declare -a SERVER_CMDS=(
  "bun src/index.jet.ts"
  "bun src/index.ts"
  "bun bunt.ts"
)
declare -a SERVER_CWDS=(
  "jetpath"
  "elysia"
  "."
)
declare -a SERVER_PORTS=(3000 3001 3002)

# ── Helpers ──────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Raise file-descriptor limit (required for high-concurrency connections).
ulimit -n 65535 2>/dev/null || true

# Colours for terminal output.
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

log()  { echo -e "${GREEN}[bench]${RESET} $*"; }
warn() { echo -e "${YELLOW}[warn]${RESET} $*"; }
err()  { echo -e "${RED}[error]${RESET} $*" >&2; }

# ── Cleanup trap ─────────────────────────────────────────────────────────────

SERVER_PID=""

cleanup() {
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    log "Stopping server (PID $SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  SERVER_PID=""
}

trap cleanup EXIT INT TERM

# ── Health-check ─────────────────────────────────────────────────────────────

wait_for_server() {
  local port=$1
  local name=$2
  local url="http://localhost:${port}/"
  local max_attempts=30   # 30 × 200 ms = 6 s max wait
  local attempt=0

  while ! curl --silent --fail --max-time 1 "$url" > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [[ $attempt -ge $max_attempts ]]; then
      err "Server '${name}' did not become ready on port ${port} after ${max_attempts} attempts."
      return 1
    fi
    sleep 0.2
  done
  log "Server '${name}' is ready on port ${port}."
}

# ── Start / stop server ─────────────────────────────────────────────────────

start_server() {
  local name=$1
  local cmd=$2
  local port=$3
  local server_cwd=$4

  # Make sure nothing else is on this port.
  if lsof -iTCP:"$port" -sTCP:LISTEN -t > /dev/null 2>&1; then
    warn "Port ${port} already in use — killing existing process."
    kill "$(lsof -iTCP:"$port" -sTCP:LISTEN -t)" 2>/dev/null || true
    sleep 1
  fi

  log "Starting ${BOLD}${name}${RESET} (port ${port}) from ${server_cwd}/..."
  (cd "${server_cwd}" && $cmd) &
  SERVER_PID=$!

  # Give the process a moment to either crash or start listening.
  sleep 1

  # Check if the process is still alive (catches immediate crashes).
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    err "Server '${name}' crashed on startup."
    return 1
  fi

  wait_for_server "$port" "$name"
}

stop_server() {
  local name=$1
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    log "Stopping ${name} (PID $SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  SERVER_PID=""
}

# ── Run one benchmark round ─────────────────────────────────────────────────

run_benchmark() {
  local name=$1
  local port=$2
  local round=$3
  local url="http://localhost:${port}/"
  local outfile="${RESULTS_DIR}/${name}_round${round}.json"

  # ── Warm-up ──
  log "  Warm-up: ${WARMUP_REQUESTS} requests @ ${WARMUP_CONCURRENCY} concurrency..."
  oha --no-tui \
      -n "$WARMUP_REQUESTS" \
      -c "$WARMUP_CONCURRENCY" \
      --http-version 1.1 \
      "$url" > /dev/null 2>&1

  # Brief settle after warm-up.
  sleep 1

  # ── Main run ──
  log "  Main run: ${DURATION} @ ${CONCURRENCY} concurrency → ${outfile}"
  oha --no-tui \
      -z "$DURATION" \
      -c "$CONCURRENCY" \
      --http-version 1.1 \
      --output-format json \
      "$url" | tee "$outfile"

  echo ""
}

# ── Print system info ────────────────────────────────────────────────────────

print_sysinfo() {
  echo -e "${CYAN}${BOLD}"
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║              Benchmark Environment                          ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo -e "${RESET}"
  echo "  Date       : $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo "  OS         : $(uname -s) $(uname -r) ($(uname -m))"
  echo "  CPU        : $(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo 'N/A')"
  echo "  Cores      : $(sysctl -n hw.ncpu 2>/dev/null || nproc 2>/dev/null || echo '?')"
  echo "  Memory     : $(( $(sysctl -n hw.memsize 2>/dev/null || echo 0) / 1024 / 1024 )) MiB"
  echo "  Bun        : $(bun --version 2>/dev/null || echo 'not found')"
  echo "  oha        : $(oha --version 2>/dev/null || echo 'not found')"
  echo "  ulimit -n  : $(ulimit -n)"
  echo ""
  echo "  Concurrency: ${CONCURRENCY}"
  echo "  Duration   : ${DURATION}"
  echo "  Warmup     : ${WARMUP_REQUESTS} reqs @ ${WARMUP_CONCURRENCY}c"
  echo "  Rounds     : ${ROUNDS}"
  echo ""
}

# ══════════════════════════════════════════════════════════════════════════════
#  Main
# ══════════════════════════════════════════════════════════════════════════════

mkdir -p "$RESULTS_DIR"

print_sysinfo

TOTAL=${#SERVER_NAMES[@]}

for (( i=0; i<TOTAL; i++ )); do
  name="${SERVER_NAMES[$i]}"
  cmd="${SERVER_CMDS[$i]}"
  port="${SERVER_PORTS[$i]}"
  server_cwd="${SERVER_CWDS[$i]}"

  echo -e "${CYAN}${BOLD}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Benchmarking: $(echo "$name" | tr '[:lower:]' '[:upper:]')"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "${RESET}"

  start_server "$name" "$cmd" "$port" "$server_cwd"

  for (( r=1; r<=ROUNDS; r++ )); do
    log "Round ${r}/${ROUNDS} for ${BOLD}${name}${RESET}"
    run_benchmark "$name" "$port" "$r"

    # Cooldown between rounds (skip after last round of last server).
    if [[ $r -lt $ROUNDS ]] || [[ $i -lt $((TOTAL - 1)) ]]; then
      log "  Cooldown ${COOLDOWN}s..."
      sleep "$COOLDOWN"
    fi
  done

  stop_server "$name"
  echo ""
done

echo -e "${GREEN}${BOLD}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              All benchmarks complete!                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${RESET}"
echo "  Results saved to: ${RESULTS_DIR}/"
ls -lh "${RESULTS_DIR}/"
echo ""
