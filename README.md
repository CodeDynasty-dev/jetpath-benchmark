# Benchmark

This benchmark is bun based, this is an aim to test with bun fastest framworks.

# Results

result are to verbose by running the benchmark you check out the difference your
self.

JetPath wrk 797k requests in 30.00s, 146.05MB read

---

elysia wrk 1,302k requests in 30.00s, 157.73MB read 1,004k requests in 30.00s,
121.71MB read 1,191k requests in 30.00s, 144.31MB read

bun.serve wrk 1,533k requests in 30.00s, 185.77MB read 1,467k requests in
30.00s, 177.79MB read 1,064k requests in 30.00s, 128.88MB read

Machine used for the benchmark friday@uiedbook

---

- OS: EndeavourOS Linux x86_64
- Host: 81MV Lenovo IdeaPad S145-15IWL
- Kernel: 6.4.8-arch1-1
- Shell: bash 5.1.16

This makes Jetpath one of bun's fastest frameworks and also among the fastest on
Node and deno.

# how to run this benchmark

clone this repo bun ins and run thses scripts

bun run elysia bun run jetpath bun run bench

# jetpath-benchmark

 
 

▶ BENCHMARK RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────┬──────────────────────────┬──────────────────────────┐
│Metric               │Jetpath                   │Elysia                    │
╞═════════════════════╪══════════════════════════╪══════════════════════════╡
│Requests Completed   │100000 / 100000  │100000 / 100000  │
│Success Rate         │100.00%          │100.00%          │
│Total Duration       │6.59s            │4.88s            │
│Requests per Second  │15179.11         │20500.21         │
│Data Throughput      │163.06 KB/s      │220.22 KB/s      │
│Avg Response Time    │0.35ms           │0.26ms           │
│Min Response Time    │0.09ms           │0.08ms           │
│Max Response Time    │9.48ms           │5.83ms           │
│p50 Response Time    │0.25ms           │0.20ms           │
│p90 Response Time    │0.54ms           │0.38ms           │
│p95 Response Time    │0.95ms           │0.66ms           │
│p99 Response Time    │1.77ms           │1.37ms           │
└─────────────────────┴──────────────────────────┴──────────────────────────┘
                

■ - Jetpath, ■ - Elysia

▶ BENCHMARK CONCLUSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Jetpath score: 46.38%
Elysia score: 53.62%

┌───────────────────────────────┐
│ 🏆  Elysia WINS  │
│ Outperforms Jetpath by 15.59% │
└───────────────────────────────┘

▶ RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• High variance in response times detected. Consider investigating resource contention or GC pauses.

▶ BENCHMARK SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Elysia handled 20500.21 requests/second with 0.26ms average response time
Jetpath handled 15179.11 requests/second with 0.35ms average response time

Elysia is 35.06% faster in throughput
Elysia is 30.68% faster in response time
 