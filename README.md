# Benchmark

This benchmark is bun based, this is an aim to test with bun fastest frameworks.

# Results

---

- OS: macOS 15.4.0
- Host: MacBook Pro (12 Threads)
- Memory: 32 GB
- Shell: bash 5.1.16
- Tool: oha 1.14.0

This benchmark compares **Jetpath**, **ElysiaJS**, and **Bun.serve** under high-concurrency load.

# how to run this benchmark

Clone this repo, install dependencies for each framework, and run the benchmark script:

```bash
cd jetpath && bun install && cd ..
cd elysia && bun install && cd ..

bash bench.sh
```

# Jetpath-benchmark

## Server Performance Comparison (JETPATH vs ELYSIA vs BUN)

**Benchmark Details:**

- **Tool:** oha
- **Workload:** 30s duration per round (3 rounds aggregated)
- **Concurrency:** 256 concurrent connections (tuned for 12-thread CPU)
- **Warm-up:** 10,000 requests @ 50 concurrency
- **Servers:** JETPATH (:3000), ELYSIA (:3001), BUN (:3002)

---

### Key Metrics Summary

| Metric | JETPATH (localhost:3000) | ELYSIA (localhost:3001) | BUN Native (localhost:3002) |
| :--- | :--- | :--- | :--- |
| **Success Rate** | 100.00% | 100.00% | 100.00% |
| **Requests/Second** | 38,495 | 39,082 | **48,246** |
| **Average Latency** | 8.12 ms | 6.22 ms | **5.30 ms** |
| **Median (50%) Latency** | 7.72 ms | 5.85 ms | **5.06 ms** |
| **95% Latency** | 9.30 ms | 7.05 ms | **5.95 ms** |
| **99% Latency** | 12.45 ms | 9.40 ms | **7.50 ms** |
| **Slowest Latency** | 106.7 ms | 102.4 ms | **75.3 ms** |

---

### Conclusion

All three frameworks managed to maintain a 100% success rate under a steady load of 256 concurrent connections. The benchmark setup (lifecycle management, warm-ups, and cooldowns) ensures that these results are not skewed by resource contention or thermal throttling between runs.
