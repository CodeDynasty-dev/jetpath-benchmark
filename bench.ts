// bench.ts - Elysiaenchmarking Tool for Bun.js
// Run with: bun bench.ts

const SERVER_A = "http://localhost:3000";
const SERVER_B = "http://localhost:3001";
const WARMUP_REQUESTS = 10;
const BENCHMARK_REQUESTS = 100_000;
const CONCURRENCY = 10;
const REQUEST_TIMEOUT = 5000; // ms
const PATH = "/";
const METHOD = "GET";
const REQUEST_BODY = ""; // Empty for GET, can be used for POST/PUT

// ANSI color codes for terminal output
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const BLUE = "\x1b[34m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RED = "\x1b[31m";
const BG_BLUE = "\x1b[44m";
const BG_GREEN = "\x1b[42m";

// Helper functions for terminal display
function createBox(text: string, padding = 1): string {
  const lines = text.split("\n");
  const width = Math.max(...lines.map(line => line.length)) + padding * 2;
  
  const top = "┌" + "─".repeat(width) + "┐";
  const bottom = "└" + "─".repeat(width) + "┘";
  
  const paddedLines = lines.map(line => 
    "│" + " ".repeat(padding) + line + " ".repeat(width - line.length - padding) + "│"
  );
  
  return [top, ...paddedLines, bottom].join("\n");
}

function createTable(headers: string[], rows: string[][]): string {
  // Calculate column widths
  const colWidths: number[] = headers.map((_, i) => 
    Math.max(
      headers[i].length,
      ...rows.map(row => (row[i] || "").toString().length)
    ) + 2
  );
  
  // Create separator line
  const separator = "├" + colWidths.map(w => "─".repeat(w)).join("┼") + "┤";
  
  // Create header row
  const headerRow = "│" + headers.map((h, i) => 
    h.padEnd(colWidths[i])
  ).join("│") + "│";
  
  // Create data rows
  const dataRows = rows.map(row => 
    "│" + row.map((cell, i) => 
      (cell || "").toString().padEnd(colWidths[i])
    ).join("│") + "│"
  );
  
  // Construct the table
  const top = "┌" + colWidths.map(w => "─".repeat(w)).join("┬") + "┐";
  const headerSep = "╞" + colWidths.map(w => "═".repeat(w)).join("╪") + "╡";
  const bottom = "└" + colWidths.map(w => "─".repeat(w)).join("┴") + "┘";
  
  return [top, headerRow, headerSep, ...dataRows, bottom].join("\n");
}

function formatNumber(num: number, decimals = 2): string {
  return num.toFixed(decimals);
}

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + " " + sizes[i];
}

// Interface for request result
interface RequestResult {
  success: boolean;
  time: number;
  status: number;
  bytes: number;
  error?: string;
}

// Interface for benchmark result
interface BenchmarkResult {
  name: string;
  url: string;
  successful: number;
  failed: number;
  total: number;
  successRate: number;
  totalDuration: number;
  rps: number;
  throughput: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  statusCodes: Record<string, number>;
  errors: string[];
  responseTimes: number[];
  timeStarted: Date;
  timeCompleted: Date;
}

// Function to make a single request
async function makeRequest(url: string): Promise<RequestResult> {
  const startTime = performance.now();
  let result: RequestResult = {
    success: false,
    time: 0,
    status: 0,
    bytes: 0
  };
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    const requestOptions: RequestInit = {
      method: METHOD,
      headers: {
        'User-Agent': 'Bun-Server-Benchmark/1.0',
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    };
    
    if (METHOD !== 'GET' && REQUEST_BODY) {
      requestOptions.body = REQUEST_BODY;
    }
    
    const response = await fetch(url, requestOptions);
    clearTimeout(timeoutId);
    
    const buffer = await response.arrayBuffer();
    const endTime = performance.now();
    
    result = {
      success: response.ok,
      time: endTime - startTime,
      status: response.status,
      bytes: buffer.byteLength
    };
  } catch (error) {
    const endTime = performance.now();
    result = {
      success: false,
      time: endTime - startTime,
      status: 0,
      bytes: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
  
  return result;
}

// Function to run a batch of requests concurrently
async function runConcurrentRequests(
  count: number, 
  url: string, 
  onResult?: (result: RequestResult) => void
): Promise<RequestResult[]> {
  const results: RequestResult[] = [];
  let completedCount = 0;
  
  // Run in batches to control concurrency
  const batchSize = CONCURRENCY;
  const batches = Math.ceil(count / batchSize);
  
  for (let b = 0; b < batches; b++) {
    const currentBatchSize = Math.min(batchSize, count - (b * batchSize));
    const promises: Promise<RequestResult>[] = [];
    
    for (let i = 0; i < currentBatchSize; i++) {
      promises.push(makeRequest(url));
    }
    
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
    
    // Call onResult for each result in this batch
    if (onResult) {
      batchResults.forEach(result => {
        completedCount++;
        onResult(result);
      });
    }
  }
  
  return results;
}

// Function to calculate percentiles
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  
  const sortedValues = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * values.length) - 1;
  return sortedValues[Math.max(0, index)];
}

// Function to run a benchmark for a server
async function runBenchmark(name: string, url: string): Promise<BenchmarkResult | null> {
  const fullUrl = `${url}${PATH}`;
  const results: BenchmarkResult = {
    name,
    url: fullUrl,
    successful: 0,
    failed: 0,
    total: BENCHMARK_REQUESTS,
    successRate: 0,
    totalDuration: 0,
    rps: 0,
    throughput: 0,
    avgResponseTime: 0,
    minResponseTime: 0,
    maxResponseTime: 0,
    p50: 0,
    p75: 0,
    p90: 0,
    p95: 0,
    p99: 0,
    statusCodes: {},
    errors: [],
    responseTimes: [],
    timeStarted: new Date(),
    timeCompleted: new Date()
  };
  
  // Run warmup phase
  console.log(`${BOLD}${CYAN}⚡ Warming up ${name}...${RESET}`);
  try {
    await runConcurrentRequests(WARMUP_REQUESTS, fullUrl);
    console.log(`${GREEN}✓ Completed warmup phase for ${name}${RESET}`);
  } catch (error) {
    console.error(`${RED}✗ Warmup phase failed for ${name}: ${error}${RESET}`);
    return null;
  }
  
  // Start benchmark phase
  console.log(`${BOLD}${CYAN}🔍 Running benchmark on ${name}...${RESET}`);
  let completed = 0;
  let totalBytes = 0;
  
  try {
    results.timeStarted = new Date();
    
    // Show progress indicator function
    const updateProgress = (current: number, total: number) => {
      const percent = Math.round((current / total) * 100);
      const barSize = 30;
      const completeSize = Math.round((current / total) * barSize);
      const remainingSize = barSize - completeSize;
      
      process.stdout.write(`\r${CYAN}[${RESET}${"■".repeat(completeSize)}${" ".repeat(remainingSize)}${CYAN}]${RESET} ${percent}% (${current}/${total})`);
    };
    
    await runConcurrentRequests(BENCHMARK_REQUESTS, fullUrl, (result) => {
      completed++;
      updateProgress(completed, BENCHMARK_REQUESTS);
      
      if (result.success) {
        results.successful++;
        results.responseTimes.push(result.time);
        totalBytes += result.bytes;
        
        // Track status codes
        const statusKey = result.status.toString();
        results.statusCodes[statusKey] = (results.statusCodes[statusKey] || 0) + 1;
      } else {
        results.failed++;
        if (result.error) {
          results.errors.push(result.error);
        }
      }
    });
    
    results.timeCompleted = new Date();
    console.log(`\n${GREEN}✓ Completed benchmark for ${name}${RESET}`);
    
    // Calculate statistics
    results.totalDuration = results.timeCompleted.getTime() - results.timeStarted.getTime();
    results.successRate = (results.successful / BENCHMARK_REQUESTS) * 100;
    
    if (results.responseTimes.length > 0) {
      results.avgResponseTime = results.responseTimes.reduce((sum, time) => sum + time, 0) / results.responseTimes.length;
      results.minResponseTime = Math.min(...results.responseTimes);
      results.maxResponseTime = Math.max(...results.responseTimes);
      results.p50 = percentile(results.responseTimes, 50);
      results.p75 = percentile(results.responseTimes, 75);
      results.p90 = percentile(results.responseTimes, 90);
      results.p95 = percentile(results.responseTimes, 95);
      results.p99 = percentile(results.responseTimes, 99);
    }
    
    results.rps = results.successful / (results.totalDuration / 1000);
    results.throughput = totalBytes / (results.totalDuration / 1000);
    
    return results;
  } catch (error) {
    console.error(`${RED}✗ Benchmark failed for ${name}: ${error}${RESET}`);
    return null;
  }
}

// Function to calculate weighted score for server comparison
function calculateScore(result: BenchmarkResult, otherResult: BenchmarkResult): number {
  // Weighting factors (adjust as needed)
  const weights = {
    rps: 0.35,             // Requests per second (throughput)
    successRate: 0.25,     // Reliability
    avgResponseTime: 0.15, // Average latency
    p95: 0.15,             // Tail latency
    p99: 0.10              // Worst-case latency
  };
  
  // Calculate normalized scores (higher is better)
  const rpsScore = result.rps / Math.max(result.rps, otherResult.rps);
  const successRateScore = result.successRate / 100;
  
  // For response times, lower is better so we invert the ratio
  const avgTimeScore = Math.min(otherResult.avgResponseTime, result.avgResponseTime) / 
                      Math.max(1, result.avgResponseTime);
  const p95Score = Math.min(otherResult.p95, result.p95) / 
                  Math.max(1, result.p95);
  const p99Score = Math.min(otherResult.p99, result.p99) / 
                  Math.max(1, result.p99);
  
  // Combine scores
  return (
    weights.rps * rpsScore +
    weights.successRate * successRateScore +
    weights.avgResponseTime * avgTimeScore +
    weights.p95 * p95Score +
    weights.p99 * p99Score
  );
}

// Function to visualize response time distribution
function visualizeResponseTimes(results: BenchmarkResult[]): string {
  const bucketCount = 20;
  const maxResponseTime = Math.max(
    ...results.map(r => Math.min(r.p99 * 1.1, r.maxResponseTime))
  );
  
  const bucketSize = maxResponseTime / bucketCount;
  const buckets: number[][] = Array(bucketCount).fill(0).map(() => [0, 0]);
  
  // Fill buckets for both results
  results.forEach((result, serverIndex) => {
    result.responseTimes.forEach(time => {
      const bucketIndex = Math.min(bucketCount - 1, Math.floor(time / bucketSize));
      buckets[bucketIndex][serverIndex]++;
    });
  });
  
  // Normalize by maximum count for visualization
  const maxCount = Math.max(
    ...buckets.flatMap(bucket => bucket)
  );
  
  // Generate histogram
  const barWidth = 30; // characters
  let output = `${BOLD}Response Time Distribution:${RESET}\n`;
  
  buckets.forEach((bucket, i) => {
    const start = i * bucketSize;
    const end = (i + 1) * bucketSize;
    const serverA = Math.round((bucket[0] / maxCount) * barWidth);
    const serverB = Math.round((bucket[1] / maxCount) * barWidth);
    
    output += `${formatNumber(start, 0)}-${formatNumber(end, 0)}ms `;
    output += `${BLUE}${"█".repeat(serverA)}${" ".repeat(barWidth - serverA)}${RESET} `;
    output += `${GREEN}${"█".repeat(serverB)}${RESET}\n`;
  });
  
  return output;
}

// Main function
async function main() {
  // Display benchmark header
  console.log("\n" + createBox(
    `${BOLD}BENCHMARK TOOL${RESET}\n` +
    `Server performance comparison`
  ));
  
  // Display configuration
  console.log(`\n${BOLD}${CYAN}▶ BENCHMARK CONFIGURATION${RESET}`);
  console.log(`${CYAN}${"━".repeat(60)}${RESET}`);
  console.log(`${BOLD}Jetpath:${RESET} ${SERVER_A}${PATH}`);
  console.log(`${BOLD}Elysia:${RESET} ${SERVER_B}${PATH}`);
  console.log(`${BOLD}Warmup Requests:${RESET} ${WARMUP_REQUESTS}`);
  console.log(`${BOLD}Benchmark Requests:${RESET} ${BENCHMARK_REQUESTS}`);
  console.log(`${BOLD}Concurrency:${RESET} ${CONCURRENCY}`);
  console.log(`${BOLD}Method:${RESET} ${METHOD}`);
  console.log(`${BOLD}Timeout:${RESET} ${REQUEST_TIMEOUT}ms`);
  
  // Run benchmarks
  console.log(`\n${BOLD}${CYAN}▶ RUNNING BENCHMARKS${RESET}`);
  console.log(`${CYAN}${"━".repeat(60)}${RESET}`);
  
  const serverAResult = await runBenchmark("Jetpath", SERVER_A);
  const serverBResult = await runBenchmark("Elysia", SERVER_B);
  
  if (!serverAResult || !serverBResult) {
    console.error(`\n${RED}✗ Benchmark failed. Unable to compare servers.${RESET}`);
    process.exit(1);
  }
  
  // Display results
  console.log(`\n${BOLD}${CYAN}▶ BENCHMARK RESULTS${RESET}`);
  console.log(`${CYAN}${"━".repeat(60)}${RESET}`);
  
  const resultRows = [
    ["Requests Completed", 
      `${BLUE}${serverAResult.successful} / ${serverAResult.total}${RESET}`, 
      `${GREEN}${serverBResult.successful} / ${serverBResult.total}${RESET}`],
    ["Success Rate", 
      `${BLUE}${formatNumber(serverAResult.successRate)}%${RESET}`, 
      `${GREEN}${formatNumber(serverBResult.successRate)}%${RESET}`],
    ["Total Duration", 
      `${BLUE}${formatNumber(serverAResult.totalDuration / 1000)}s${RESET}`, 
      `${GREEN}${formatNumber(serverBResult.totalDuration / 1000)}s${RESET}`],
    ["Requests per Second", 
      `${BLUE}${formatNumber(serverAResult.rps)}${RESET}`, 
      `${GREEN}${formatNumber(serverBResult.rps)}${RESET}`],
    ["Data Throughput", 
      `${BLUE}${formatBytes(serverAResult.throughput)}/s${RESET}`, 
      `${GREEN}${formatBytes(serverBResult.throughput)}/s${RESET}`],
    ["Avg Response Time", 
      `${BLUE}${formatNumber(serverAResult.avgResponseTime)}ms${RESET}`, 
      `${GREEN}${formatNumber(serverBResult.avgResponseTime)}ms${RESET}`],
    ["Min Response Time", 
      `${BLUE}${formatNumber(serverAResult.minResponseTime)}ms${RESET}`, 
      `${GREEN}${formatNumber(serverBResult.minResponseTime)}ms${RESET}`],
    ["Max Response Time", 
      `${BLUE}${formatNumber(serverAResult.maxResponseTime)}ms${RESET}`, 
      `${GREEN}${formatNumber(serverBResult.maxResponseTime)}ms${RESET}`],
    ["p50 Response Time", 
      `${BLUE}${formatNumber(serverAResult.p50)}ms${RESET}`, 
      `${GREEN}${formatNumber(serverBResult.p50)}ms${RESET}`],
    ["p90 Response Time", 
      `${BLUE}${formatNumber(serverAResult.p90)}ms${RESET}`, 
      `${GREEN}${formatNumber(serverBResult.p90)}ms${RESET}`],
    ["p95 Response Time", 
      `${BLUE}${formatNumber(serverAResult.p95)}ms${RESET}`, 
      `${GREEN}${formatNumber(serverBResult.p95)}ms${RESET}`],
    ["p99 Response Time", 
      `${BLUE}${formatNumber(serverAResult.p99)}ms${RESET}`, 
      `${GREEN}${formatNumber(serverBResult.p99)}ms${RESET}`]
  ];
  
  console.log(createTable(["Metric", "Jetpath", "Elysia"], resultRows));
  
  // Display status code distribution
  console.log(`\n${BOLD}${CYAN}▶ STATUS CODE DISTRIBUTION${RESET}`);
  console.log(`${CYAN}${"━".repeat(60)}${RESET}`);
  
  // Combine all status codes from both servers
  const allStatusCodes = new Set([
    ...Object.keys(serverAResult.statusCodes),
    ...Object.keys(serverBResult.statusCodes)
  ]);
  
  const statusCodeRows: string[][] = [];
  allStatusCodes.forEach(code => {
    const countA = serverAResult.statusCodes[code] || 0;
    const countB = serverBResult.statusCodes[code] || 0;
    statusCodeRows.push([
      code,
      `${BLUE}${countA} (${formatNumber((countA / serverAResult.total) * 100, 1)}%)${RESET}`,
      `${GREEN}${countB} (${formatNumber((countB / serverBResult.total) * 100, 1)}%)${RESET}`
    ]);
  });
  
  console.log(createTable(["Status Code", "Jetpath", "Elysia"], statusCodeRows));
  
  // Error overview if any errors occurred
  if (serverAResult.errors.length > 0 || serverBResult.errors.length > 0) {
    console.log(`\n${BOLD}${CYAN}▶ ERROR OVERVIEW${RESET}`);
    console.log(`${CYAN}${"━".repeat(60)}${RESET}`);
    
    if (serverAResult.errors.length > 0) {
      console.log(`\n${BLUE}${BOLD}Jetpath Errors:${RESET}`);
      serverAResult.errors.slice(0, 5).forEach((error, index) => {
        console.log(`  ${BLUE}${index + 1}. ${error}${RESET}`);
      });
      if (serverAResult.errors.length > 5) {
        console.log(`  ${BLUE}... and ${serverAResult.errors.length - 5} more errors${RESET}`);
      }
    }
    
    if (serverBResult.errors.length > 0) {
      console.log(`\n${GREEN}${BOLD}Elysia Errors:${RESET}`);
      serverBResult.errors.slice(0, 5).forEach((error, index) => {
        console.log(`  ${GREEN}${index + 1}. ${error}${RESET}`);
      });
      if (serverBResult.errors.length > 5) {
        console.log(`  ${GREEN}... and ${serverBResult.errors.length - 5} more errors${RESET}`);
      }
    }
  }
  
  // Response time distribution visualization
  console.log(`\n${BOLD}${CYAN}▶ RESPONSE TIME DISTRIBUTION${RESET}`);
  console.log(`${CYAN}${"━".repeat(60)}${RESET}`);
  console.log(visualizeResponseTimes([serverAResult, serverBResult]));
  console.log(`${BLUE}■${RESET} - Jetpath, ${GREEN}■${RESET} - Elysia`);
  
  // Calculate scores and determine winner
  console.log(`\n${BOLD}${CYAN}▶ BENCHMARK CONCLUSION${RESET}`);
  console.log(`${CYAN}${"━".repeat(60)}${RESET}`);
  
  const scoreA = calculateScore(serverAResult, serverBResult);
  const scoreB = calculateScore(serverBResult, serverAResult);
  
  // Format scores as percentages for better interpretation
  const scoreAPercent = (scoreA / (scoreA + scoreB)) * 100;
  const scoreBPercent = (scoreB / (scoreA + scoreB)) * 100;
  
  console.log(`Jetpath score: ${BLUE}${formatNumber(scoreAPercent)}%${RESET}`);
  console.log(`Elysia score: ${GREEN}${formatNumber(scoreBPercent)}%${RESET}`);
  
  // Highlight winner
  const scoreDiff = Math.abs(scoreA - scoreB);
  const percentImprovement = ((Math.max(scoreA, scoreB) / Math.min(scoreA, scoreB)) - 1) * 100;
  
  let winnerBox;
  if (scoreDiff < 0.05) {
    winnerBox = createBox(`${YELLOW}${BOLD}⚖️  PERFORMANCE DIFFERENCE IS NEGLIGIBLE${RESET}\n` +
                        `Both servers perform similarly`);
  } else if (scoreA > scoreB) {
    winnerBox = createBox(`${BLUE}${BOLD}🏆  Jetpath WINS${RESET}\n` +
                        `Outperforms Elysia by ${formatNumber(percentImprovement)}%`);
  } else {
    winnerBox = createBox(`${GREEN}${BOLD}🏆  Elysia WINS${RESET}\n` +
                        `Outperforms Jetpath by ${formatNumber(percentImprovement)}%`);
  }
  
  console.log(`\n${winnerBox}`);
  
  // Recommendations
  console.log(`\n${BOLD}${CYAN}▶ RECOMMENDATIONS${RESET}`);
  console.log(`${CYAN}${"━".repeat(60)}${RESET}`);
  
  // Generate recommendations based on results
  const recommendations: string[] = [];
  
  // Check for failed requests
  if (serverAResult.failed > 0 || serverBResult.failed > 0) {
    recommendations.push(`• ${YELLOW}Investigate failed requests to improve reliability.${RESET}`);
  }
  
  // Check for high latency
  if (serverAResult.p95 > 1000 || serverBResult.p95 > 1000) {
    recommendations.push(`• ${YELLOW}High p95 response times detected. Consider optimizing slow paths in your code.${RESET}`);
  }
  
  // Check for throughput
  const throughputDiff = Math.abs(serverAResult.throughput - serverBResult.throughput) / 
                         Math.max(serverAResult.throughput, serverBResult.throughput);
  if (throughputDiff > 0.3) {
    recommendations.push(`• ${YELLOW}Significant difference in throughput detected. The slower server may benefit from response compression or optimization.${RESET}`);
  }
  
  // Check for high variance
  const calcVariance = (result: BenchmarkResult) => {
    const mean = result.avgResponseTime;
    const variance = result.responseTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / 
                    result.responseTimes.length;
    return Math.sqrt(variance) / mean; // Coefficient of variation
  };
  
  const cvA = calcVariance(serverAResult);
  const cvB = calcVariance(serverBResult);
  
  if (cvA > 0.5 || cvB > 0.5) {
    recommendations.push(`• ${YELLOW}High variance in response times detected. Consider investigating resource contention or GC pauses.${RESET}`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push(`• ${GREEN}Both servers appear to be performing well within expected parameters.${RESET}`);
  }
  
  recommendations.forEach(rec => console.log(rec));
  
  // Final summary
  console.log(`\n${BOLD}${CYAN}▶ BENCHMARK SUMMARY${RESET}`);
  console.log(`${CYAN}${"━".repeat(60)}${RESET}`);
  
  // Key metrics summary
  if (scoreA > scoreB) {
    console.log(`${BLUE}Jetpath${RESET} handled ${BOLD}${formatNumber(serverAResult.rps)}${RESET} requests/second with ${BOLD}${formatNumber(serverAResult.avgResponseTime)}ms${RESET} average response time`);
    console.log(`${GREEN}Elysia${RESET} handled ${BOLD}${formatNumber(serverBResult.rps)}${RESET} requests/second with ${BOLD}${formatNumber(serverBResult.avgResponseTime)}ms${RESET} average response time`);
    
    if (serverAResult.rps > serverBResult.rps) {
      console.log(`\n${BLUE}Jetpath${RESET} is ${BOLD}${formatNumber((serverAResult.rps / serverBResult.rps - 1) * 100)}%${RESET} faster in throughput`);
    }
    if (serverBResult.avgResponseTime > serverAResult.avgResponseTime) {
      console.log(`${BLUE}Jetpath${RESET} is ${BOLD}${formatNumber((serverBResult.avgResponseTime / serverAResult.avgResponseTime - 1) * 100)}%${RESET} faster in response time`);
    }
  } else {
    console.log(`${GREEN}Elysia${RESET} handled ${BOLD}${formatNumber(serverBResult.rps)}${RESET} requests/second with ${BOLD}${formatNumber(serverBResult.avgResponseTime)}ms${RESET} average response time`);
    console.log(`${BLUE}Jetpath${RESET} handled ${BOLD}${formatNumber(serverAResult.rps)}${RESET} requests/second with ${BOLD}${formatNumber(serverAResult.avgResponseTime)}ms${RESET} average response time`);
    
    if (serverBResult.rps > serverAResult.rps) {
      console.log(`\n${GREEN}Elysia${RESET} is ${BOLD}${formatNumber((serverBResult.rps / serverAResult.rps - 1) * 100)}%${RESET} faster in throughput`);
    }
    if (serverAResult.avgResponseTime > serverBResult.avgResponseTime) {
      console.log(`${GREEN}Elysia${RESET} is ${BOLD}${formatNumber((serverAResult.avgResponseTime / serverBResult.avgResponseTime - 1) * 100)}%${RESET} faster in response time`);
    }
  }
  
  console.log(`\n${DIM}Benchmark completed at ${new Date().toISOString()}${RESET}`);
}

// Run the benchmark
console.log("Starting benchmark...");
main().catch(error => {
  console.error(`${RED}Benchmark failed: ${error}${RESET}`);
  process.exit(1);
});
