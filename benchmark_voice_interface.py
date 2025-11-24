#!/usr/bin/env python3
"""
Voice Interface V3 - Performance Benchmark Suite
Measures query performance, indexing speed, and scalability

Created: 2025-11-24
Purpose: Track performance metrics and identify bottlenecks
"""

import sys
import time
import json
import statistics
from pathlib import Path
from datetime import datetime
from typing import Dict, List

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from voice_interface_v3_production import VoiceInterfaceV3, Config
    print("[OK] Voice Interface V3 imported successfully")
except ImportError as e:
    print(f"[ERROR] Failed to import Voice Interface V3: {e}")
    sys.exit(1)


class BenchmarkSuite:
    """Performance benchmark suite"""

    def __init__(self):
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "benchmarks": [],
            "summary": {}
        }
        self.interface = None
        self.config = None

    def run_benchmark(self, name: str, func, iterations: int = 10):
        """Run a benchmark multiple times and collect statistics"""
        print(f"\n{'='*70}")
        print(f"BENCHMARK: {name}")
        print(f"{'='*70}")
        print(f"Iterations: {iterations}")

        times = []
        for i in range(iterations):
            start = time.time()
            result = func()
            duration = time.time() - start
            times.append(duration)

            if i == 0:  # Print first iteration details
                print(f"\nFirst iteration: {duration:.4f}s")

        # Calculate statistics
        avg_time = statistics.mean(times)
        min_time = min(times)
        max_time = max(times)
        median_time = statistics.median(times)
        stdev_time = statistics.stdev(times) if len(times) > 1 else 0

        print(f"\nStatistics:")
        print(f"  Average:  {avg_time:.4f}s")
        print(f"  Median:   {median_time:.4f}s")
        print(f"  Min:      {min_time:.4f}s")
        print(f"  Max:      {max_time:.4f}s")
        print(f"  Std Dev:  {stdev_time:.4f}s")
        print(f"  Total:    {sum(times):.4f}s")

        # Calculate throughput
        queries_per_sec = 1.0 / avg_time if avg_time > 0 else 0
        print(f"\nThroughput: {queries_per_sec:.2f} queries/sec")

        # Record results
        self.results["benchmarks"].append({
            "name": name,
            "iterations": iterations,
            "times": times,
            "average": avg_time,
            "median": median_time,
            "min": min_time,
            "max": max_time,
            "stdev": stdev_time,
            "throughput": queries_per_sec
        })

        return avg_time

    # ==================== INITIALIZATION BENCHMARKS ====================

    def bench_initialization(self):
        """Benchmark system initialization"""
        def init():
            config = Config()
            interface = VoiceInterfaceV3(config)
            return interface

        return self.run_benchmark("System Initialization", init, iterations=5)

    def bench_knowledge_base_loading(self):
        """Benchmark knowledge base loading"""
        def load():
            if not self.interface:
                self.config = Config()
                self.interface = VoiceInterfaceV3(self.config)

            # Create fresh instance to test loading
            interface = VoiceInterfaceV3(self.config)
            size = interface.initialize_knowledge_base()
            return size

        return self.run_benchmark("Knowledge Base Loading", load, iterations=3)

    # ==================== QUERY BENCHMARKS ====================

    def bench_simple_query(self):
        """Benchmark simple keyword query"""
        if not self.interface or self.interface.knowledge_base_size == 0:
            self.config = Config()
            self.interface = VoiceInterfaceV3(self.config)
            self.interface.initialize_knowledge_base()

        def query():
            return self.interface.process_query("Trinity")

        return self.run_benchmark("Simple Query (single keyword)", query, iterations=20)

    def bench_complex_query(self):
        """Benchmark complex multi-keyword query"""
        def query():
            return self.interface.process_query("What frameworks did we build for autonomous work?")

        return self.run_benchmark("Complex Query (multiple keywords)", query, iterations=20)

    def bench_time_filtered_query(self):
        """Benchmark query with time filtering"""
        def query():
            return self.interface.process_query("What happened last month?")

        return self.run_benchmark("Time-Filtered Query", query, iterations=20)

    def bench_category_query(self):
        """Benchmark category-based query"""
        def query():
            return self.interface.process_query("Show me session reports")

        return self.run_benchmark("Category Query", query, iterations=20)

    # ==================== SCALABILITY BENCHMARKS ====================

    def bench_batch_queries(self):
        """Benchmark batch query processing"""
        queries = [
            "Trinity",
            "Voice Interface",
            "Session reports",
            "Frameworks",
            "Oracle predictions",
            "Autonomous work",
            "External Brain",
            "Pattern Theory",
            "Consciousness elevation",
            "Knowledge base"
        ]

        def batch():
            for q in queries:
                self.interface.process_query(q)
            return len(queries)

        avg_time = self.run_benchmark("Batch Queries (10 queries)", batch, iterations=5)

        # Calculate per-query time
        per_query = avg_time / len(queries)
        print(f"\nPer-query average: {per_query:.4f}s")

        return avg_time

    def bench_concurrent_simulation(self):
        """Simulate concurrent query load"""
        # Simulate multiple users with sequential queries
        queries = ["test query"] * 50

        def simulate():
            count = 0
            for q in queries:
                self.interface.process_query(q)
                count += 1
            return count

        avg_time = self.run_benchmark("Concurrent Simulation (50 queries)", simulate, iterations=3)

        # Calculate throughput
        throughput = len(queries) / avg_time if avg_time > 0 else 0
        print(f"\nSimulated throughput: {throughput:.2f} queries/sec")

        return avg_time

    # ==================== COMPONENT BENCHMARKS ====================

    def bench_nlp_processing(self):
        """Benchmark NLP processing alone"""
        if not self.interface.nlp_processor:
            print("  Skipped: NLP processor not available")
            return 0

        def process():
            return self.interface.nlp_processor.process_query("What frameworks did we build last month?")

        return self.run_benchmark("NLP Processing Only", process, iterations=100)

    def bench_search_only(self):
        """Benchmark search engine alone"""
        if not self.interface.search_engine:
            print("  Skipped: Search engine not available")
            return 0

        def search():
            search_params = {
                "keywords": ["trinity", "framework"],
                "categories": [],
                "time_range": None,
                "filters": {},
                "intent": "search",
                "strategy": "keyword_search"
            }
            return self.interface.search_engine.search(search_params)

        return self.run_benchmark("Search Engine Only", search, iterations=50)

    # ==================== MEMORY BENCHMARKS ====================

    def bench_memory_usage(self):
        """Benchmark memory usage (estimates)"""
        print(f"\n{'='*70}")
        print("BENCHMARK: Memory Usage")
        print(f"{'='*70}")

        if not self.interface:
            self.config = Config()
            self.interface = VoiceInterfaceV3(self.config)
            self.interface.initialize_knowledge_base()

        kb_size = self.interface.knowledge_base_size
        print(f"\nKnowledge Base Size: {kb_size} items")

        # Estimate memory per item (rough calculation)
        estimated_kb_per_item = 5  # Rough estimate: ~5KB per item
        estimated_total_mb = (kb_size * estimated_kb_per_item) / 1024

        print(f"Estimated Memory: ~{estimated_total_mb:.2f} MB")
        print(f"Per Item: ~{estimated_kb_per_item} KB")

        # Query history size
        history_size = len(self.interface.query_history)
        print(f"\nQuery History: {history_size} queries")

        return estimated_total_mb


def run_all_benchmarks():
    """Run complete benchmark suite"""
    print("\n" + "="*70)
    print("VOICE INTERFACE V3 - PERFORMANCE BENCHMARK SUITE")
    print("="*70)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    suite = BenchmarkSuite()

    # Initialization Benchmarks
    print("\n" + "="*70)
    print("INITIALIZATION BENCHMARKS")
    print("="*70)
    suite.bench_initialization()
    suite.bench_knowledge_base_loading()

    # Query Benchmarks
    print("\n" + "="*70)
    print("QUERY BENCHMARKS")
    print("="*70)
    suite.bench_simple_query()
    suite.bench_complex_query()
    suite.bench_time_filtered_query()
    suite.bench_category_query()

    # Scalability Benchmarks
    print("\n" + "="*70)
    print("SCALABILITY BENCHMARKS")
    print("="*70)
    suite.bench_batch_queries()
    suite.bench_concurrent_simulation()

    # Component Benchmarks
    print("\n" + "="*70)
    print("COMPONENT BENCHMARKS")
    print("="*70)
    suite.bench_nlp_processing()
    suite.bench_search_only()

    # Memory Benchmarks
    print("\n" + "="*70)
    print("MEMORY BENCHMARKS")
    print("="*70)
    suite.bench_memory_usage()

    # Summary
    print("\n" + "="*70)
    print("BENCHMARK SUMMARY")
    print("="*70)

    # Calculate summary statistics
    query_benchmarks = [b for b in suite.results["benchmarks"] if "Query" in b["name"]]

    if query_benchmarks:
        avg_query_times = [b["average"] for b in query_benchmarks]
        overall_avg = statistics.mean(avg_query_times)
        overall_min = min(avg_query_times)
        overall_max = max(avg_query_times)

        print(f"\nQuery Performance:")
        print(f"  Average: {overall_avg:.4f}s")
        print(f"  Fastest: {overall_min:.4f}s")
        print(f"  Slowest: {overall_max:.4f}s")

        # Throughput
        throughput = 1.0 / overall_avg if overall_avg > 0 else 0
        print(f"  Throughput: {throughput:.2f} queries/sec")

    # Top 3 fastest benchmarks
    print("\nFastest Operations:")
    fastest = sorted(suite.results["benchmarks"], key=lambda x: x["average"])[:3]
    for i, b in enumerate(fastest, 1):
        print(f"  {i}. {b['name']}: {b['average']:.4f}s")

    # Top 3 slowest benchmarks
    print("\nSlowest Operations:")
    slowest = sorted(suite.results["benchmarks"], key=lambda x: x["average"], reverse=True)[:3]
    for i, b in enumerate(slowest, 1):
        print(f"  {i}. {b['name']}: {b['average']:.4f}s")

    # Performance grades
    print("\nPerformance Grades:")
    for b in suite.results["benchmarks"]:
        avg = b["average"]
        if "Query" in b["name"]:
            if avg < 0.01:
                grade = "A+ (Excellent)"
            elif avg < 0.05:
                grade = "A (Very Good)"
            elif avg < 0.1:
                grade = "B (Good)"
            elif avg < 0.5:
                grade = "C (Acceptable)"
            else:
                grade = "D (Needs Optimization)"

            print(f"  {b['name']}: {grade}")

    # Save results
    results_file = Path("logs") / f"benchmark_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    results_file.parent.mkdir(exist_ok=True)

    suite.results["summary"] = {
        "total_benchmarks": len(suite.results["benchmarks"]),
        "query_avg": overall_avg if query_benchmarks else 0,
        "query_throughput": throughput if query_benchmarks else 0
    }

    with open(results_file, 'w') as f:
        json.dump(suite.results, f, indent=2)

    print(f"\nDetailed results saved to: {results_file}")

    # Performance assessment
    print("\n" + "="*70)
    if query_benchmarks and overall_avg < 0.1:
        print("OVERALL PERFORMANCE: EXCELLENT ✅")
        print("System meets production performance requirements")
    elif query_benchmarks and overall_avg < 0.5:
        print("OVERALL PERFORMANCE: GOOD ✅")
        print("System performance is acceptable for production")
    else:
        print("OVERALL PERFORMANCE: NEEDS OPTIMIZATION ⚠️")
        print("Consider performance improvements before production deployment")

    print("="*70)


if __name__ == "__main__":
    run_all_benchmarks()
