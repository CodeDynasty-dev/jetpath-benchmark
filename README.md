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
