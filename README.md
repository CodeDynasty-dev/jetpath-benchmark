# Benchmark

This benchmark is bun based, this is an aim to test with bun fastest frameworks.

# Results

---

- OS: EndeavourOS Linux x86_64
- Host: 81MV Lenovo IdeaPad S145-15IWL
- Kernel: 6.4.8-arch1-1
- Shell: bash 5.1.16

This makes Jetpath one of bun's fastest frameworks and also among the fastest on
Node and deno.

# how to run this benchmark

clone this repo bun ins and run these scripts

```bash
bun run elysia
bun run jetpath
bun run bench
```

# Jetpath-benchmark

## Server Performance Comparison (JETPATH vs ELYSIA)

**Benchmark Details:**

- **Tool:** oha
- **Workload:** 1,000,000 requests @ 1,000 concurrent connections (following warm-up)
- **Servers:** JETPATH (localhost:3000), ELYSIA (localhost:3001)

---

### Key Metrics Summary

| Metric                   | JETPATH (localhost:3000) | ELYSIA (localhost:3001) | Comparison Summary                                                            |
| :----------------------- | :----------------------- | :---------------------- | :---------------------------------------------------------------------------- |
| **Success Rate**         | 100.00%                  | 100.00%                 | Both servers handled all requests successfully.                               |
| **Total Time**           | **31.84 seconds**        | 32.80 seconds           | JETPATH finished **~2.9% faster**.                                            |
| **Requests/Second**      | **31,409 req/sec**       | 30,490 req/sec          | JETPATH processed **~3.0% more requests/sec**.                                |
| **Average Latency**      | **31.8 ms**              | 32.7 ms                 | JETPATH had **~2.7% lower average latency**.                                  |
| **Median (50%) Latency** | 31.2 ms                  | **22.4 ms**             | ELYSIA is **~28.2% faster** for the median request.                           |
| **95% Latency**          | **66.0 ms**              | 97.8 ms                 | JETPATH is **~32.5% faster** for 95% of requests.                             |
| **99% Latency**          | **113.9 ms**             | 175.7 ms                | JETPATH is **~35.2% faster** for 99% of requests.                             |
| **Slowest Latency**      | **0.22 seconds**         | 1.97 seconds            | JETPATH's slowest response was **~89% faster** than ELYSIA's extreme outlier. |

---

### Conclusion

JETPATH shows slightly higher overall throughput and lower average latency. However, ELYSIA demonstrates faster performance for the typical request (median latency). Critically, JETPATH exhibits significantly better latency consistency, particularly for the slowest requests (95th, 99th percentiles, and absolute slowest), avoiding the severe latency spikes seen in ELYSIA.
