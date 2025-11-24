#!/usr/bin/env python3
"""
Voice Interface V3 - Comprehensive Test Suite
Includes unit tests, integration tests, edge cases, and performance benchmarks

Created: 2025-11-24
Purpose: Ensure production quality and measure performance
"""

import sys
import time
import json
from pathlib import Path
from typing import Dict, List

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from voice_interface_v3_production import VoiceInterfaceV3, Config
    print("[OK] Voice Interface V3 imported successfully")
except ImportError as e:
    print(f"[ERROR] Failed to import Voice Interface V3: {e}")
    sys.exit(1)


class TestSuite:
    """Comprehensive test suite for Voice Interface V3"""

    def __init__(self):
        self.results = {
            "passed": 0,
            "failed": 0,
            "total": 0,
            "tests": []
        }
        self.interface = None
        self.config = None

    def run_test(self, test_name: str, test_func):
        """Run a single test and record results"""
        self.results["total"] += 1
        print(f"\n[TEST {self.results['total']}] {test_name}")

        try:
            start_time = time.time()
            result = test_func()
            duration = time.time() - start_time

            if result:
                print(f"  ✅ PASS ({duration:.3f}s)")
                self.results["passed"] += 1
                status = "PASS"
            else:
                print(f"  ❌ FAIL ({duration:.3f}s)")
                self.results["failed"] += 1
                status = "FAIL"

            self.results["tests"].append({
                "name": test_name,
                "status": status,
                "duration": duration
            })

            return result

        except Exception as e:
            duration = time.time() - start_time
            print(f"  ❌ ERROR: {e} ({duration:.3f}s)")
            self.results["failed"] += 1
            self.results["tests"].append({
                "name": test_name,
                "status": "ERROR",
                "duration": duration,
                "error": str(e)
            })
            return False

    # ==================== INITIALIZATION TESTS ====================

    def test_config_initialization(self) -> bool:
        """Test configuration object initialization"""
        try:
            self.config = Config()
            assert self.config is not None
            assert self.config.storage_path.exists()
            assert isinstance(self.config.max_files_to_index, int)
            return True
        except Exception as e:
            print(f"    Error: {e}")
            return False

    def test_interface_initialization(self) -> bool:
        """Test Voice Interface initialization"""
        try:
            self.interface = VoiceInterfaceV3(self.config)
            assert self.interface is not None
            assert self.interface.config is not None
            assert self.interface.logger is not None
            return True
        except Exception as e:
            print(f"    Error: {e}")
            return False

    def test_knowledge_base_loading(self) -> bool:
        """Test knowledge base loading"""
        try:
            kb_size = self.interface.initialize_knowledge_base()
            assert kb_size > 0, "Knowledge base is empty"
            assert self.interface.knowledge_base_size > 0
            print(f"    Loaded {kb_size} items")
            return True
        except Exception as e:
            print(f"    Error: {e}")
            return False

    # ==================== QUERY PROCESSING TESTS ====================

    def test_simple_query(self) -> bool:
        """Test simple keyword query"""
        try:
            result = self.interface.process_query("Trinity")
            assert result['success'], "Query failed"
            assert len(result['results']) > 0, "No results found"
            print(f"    Found {len(result['results'])} results")
            return True
        except Exception as e:
            print(f"    Error: {e}")
            return False

    def test_complex_query(self) -> bool:
        """Test complex multi-keyword query"""
        try:
            result = self.interface.process_query("What frameworks did we build for autonomous work?")
            assert result['success'], "Query failed"
            print(f"    Found {len(result['results'])} results")
            return True
        except Exception as e:
            print(f"    Error: {e}")
            return False

    def test_question_query(self) -> bool:
        """Test question-style query"""
        try:
            result = self.interface.process_query("What is the External Brain?")
            assert result['success'], "Query failed"
            assert 'response' in result
            assert len(result['response']) > 0
            return True
        except Exception as e:
            print(f"    Error: {e}")
            return False

    # ==================== EDGE CASE TESTS ====================

    def test_empty_query(self) -> bool:
        """Test handling of empty query"""
        try:
            result = self.interface.process_query("")
            # Should handle gracefully, either returning empty or error
            assert 'success' in result
            return True
        except Exception as e:
            print(f"    Error: {e}")
            return False

    def test_very_long_query(self) -> bool:
        """Test handling of very long query"""
        try:
            long_query = "What " + "is " * 100 + "Trinity?"
            result = self.interface.process_query(long_query)
            assert 'success' in result
            return True
        except Exception as e:
            print(f"    Error: {e}")
            return False

    def test_special_characters_query(self) -> bool:
        """Test query with special characters"""
        try:
            result = self.interface.process_query("Find C1 × C2 × C3 = ∞")
            assert 'success' in result
            return True
        except Exception as e:
            print(f"    Error: {e}")
            return False

    def test_no_results_query(self) -> bool:
        """Test query that should return no results"""
        try:
            result = self.interface.process_query("xyzabc123nonexistent")
            assert result['success'], "Query should succeed even with no results"
            # Results can be empty, that's valid
            return True
        except Exception as e:
            print(f"    Error: {e}")
            return False

    # ==================== PERFORMANCE TESTS ====================

    def test_query_performance_single(self) -> bool:
        """Test single query performance"""
        try:
            start = time.time()
            result = self.interface.process_query("Trinity")
            duration = time.time() - start

            # Should complete in under 1 second
            assert duration < 1.0, f"Query too slow: {duration:.3f}s"
            print(f"    Query time: {duration:.3f}s")
            return True
        except Exception as e:
            print(f"    Error: {e}")
            return False

    def test_query_performance_batch(self) -> bool:
        """Test batch query performance"""
        try:
            queries = [
                "Trinity",
                "Voice Interface",
                "Session reports",
                "Frameworks",
                "Oracle predictions"
            ]

            start = time.time()
            for query in queries:
                self.interface.process_query(query)
            duration = time.time() - start

            avg_time = duration / len(queries)
            print(f"    {len(queries)} queries in {duration:.3f}s (avg: {avg_time:.3f}s)")

            # Average should be under 0.5s per query
            assert avg_time < 0.5, f"Average query too slow: {avg_time:.3f}s"
            return True
        except Exception as e:
            print(f"    Error: {e}")
            return False

    def test_knowledge_base_memory(self) -> bool:
        """Test knowledge base doesn't reload unnecessarily"""
        try:
            # First query triggers load
            result1 = self.interface.process_query("test")
            kb_size1 = self.interface.knowledge_base_size

            # Second query should use cached knowledge
            result2 = self.interface.process_query("test again")
            kb_size2 = self.interface.knowledge_base_size

            assert kb_size1 == kb_size2, "Knowledge base reloaded unnecessarily"
            print(f"    Knowledge base stable at {kb_size1} items")
            return True
        except Exception as e:
            print(f"    Error: {e}")
            return False

    # ==================== INTEGRATION TESTS ====================

    def test_nlp_integration(self) -> bool:
        """Test NLP processor integration"""
        try:
            if not self.interface.nlp_processor:
                print("    Skipped: NLP processor not available")
                return True

            result = self.interface.process_query("What did we build last month?")
            assert result['success']
            assert 'processed' in result
            assert 'intent' in result['processed']
            print(f"    Intent detected: {result['processed']['intent']}")
            return True
        except Exception as e:
            print(f"    Error: {e}")
            return False

    def test_search_engine_integration(self) -> bool:
        """Test search engine integration"""
        try:
            result = self.interface.process_query("Trinity framework")
            assert result['success']
            assert 'results' in result
            assert len(result['results']) > 0
            return True
        except Exception as e:
            print(f"    Error: {e}")
            return False

    def test_response_generation(self) -> bool:
        """Test response generation"""
        try:
            result = self.interface.process_query("What is Pattern Theory?")
            assert result['success']
            assert 'response' in result
            assert len(result['response']) > 20, "Response too short"
            print(f"    Response length: {len(result['response'])} chars")
            return True
        except Exception as e:
            print(f"    Error: {e}")
            return False

    # ==================== STATISTICS TESTS ====================

    def test_stats_retrieval(self) -> bool:
        """Test system statistics retrieval"""
        try:
            stats = self.interface.get_stats()
            assert 'knowledge_base_size' in stats
            assert 'queries_processed' in stats
            assert 'platform' in stats
            print(f"    Stats keys: {len(stats)}")
            return True
        except Exception as e:
            print(f"    Error: {e}")
            return False

    def test_query_history(self) -> bool:
        """Test query history tracking"""
        try:
            initial_count = len(self.interface.query_history)
            self.interface.process_query("test query")
            final_count = len(self.interface.query_history)

            assert final_count > initial_count, "Query not added to history"
            print(f"    History size: {final_count}")
            return True
        except Exception as e:
            print(f"    Error: {e}")
            return False

    def test_history_saving(self) -> bool:
        """Test query history saving"""
        try:
            if len(self.interface.query_history) == 0:
                self.interface.process_query("test")

            history_file = self.interface.save_history("test_history_comprehensive.json")
            assert history_file is not None

            # Verify file exists
            history_path = Path(history_file)
            assert history_path.exists(), "History file not created"

            # Verify it's valid JSON
            with open(history_path) as f:
                data = json.load(f)
                assert isinstance(data, list)

            print(f"    Saved {len(data)} queries to {history_path.name}")
            return True
        except Exception as e:
            print(f"    Error: {e}")
            return False


def run_comprehensive_tests():
    """Run all tests and generate report"""
    print("\n" + "="*70)
    print("VOICE INTERFACE V3 - COMPREHENSIVE TEST SUITE")
    print("="*70)

    suite = TestSuite()

    # Initialization Tests
    print("\n" + "="*70)
    print("INITIALIZATION TESTS")
    print("="*70)
    suite.run_test("Config Initialization", suite.test_config_initialization)
    suite.run_test("Interface Initialization", suite.test_interface_initialization)
    suite.run_test("Knowledge Base Loading", suite.test_knowledge_base_loading)

    # Query Processing Tests
    print("\n" + "="*70)
    print("QUERY PROCESSING TESTS")
    print("="*70)
    suite.run_test("Simple Query", suite.test_simple_query)
    suite.run_test("Complex Query", suite.test_complex_query)
    suite.run_test("Question Query", suite.test_question_query)

    # Edge Case Tests
    print("\n" + "="*70)
    print("EDGE CASE TESTS")
    print("="*70)
    suite.run_test("Empty Query", suite.test_empty_query)
    suite.run_test("Very Long Query", suite.test_very_long_query)
    suite.run_test("Special Characters", suite.test_special_characters_query)
    suite.run_test("No Results Query", suite.test_no_results_query)

    # Performance Tests
    print("\n" + "="*70)
    print("PERFORMANCE TESTS")
    print("="*70)
    suite.run_test("Single Query Performance", suite.test_query_performance_single)
    suite.run_test("Batch Query Performance", suite.test_query_performance_batch)
    suite.run_test("Knowledge Base Memory", suite.test_knowledge_base_memory)

    # Integration Tests
    print("\n" + "="*70)
    print("INTEGRATION TESTS")
    print("="*70)
    suite.run_test("NLP Integration", suite.test_nlp_integration)
    suite.run_test("Search Engine Integration", suite.test_search_engine_integration)
    suite.run_test("Response Generation", suite.test_response_generation)

    # Statistics Tests
    print("\n" + "="*70)
    print("STATISTICS TESTS")
    print("="*70)
    suite.run_test("Stats Retrieval", suite.test_stats_retrieval)
    suite.run_test("Query History", suite.test_query_history)
    suite.run_test("History Saving", suite.test_history_saving)

    # Final Report
    print("\n" + "="*70)
    print("TEST RESULTS")
    print("="*70)

    total = suite.results["total"]
    passed = suite.results["passed"]
    failed = suite.results["failed"]
    pass_rate = (passed / total * 100) if total > 0 else 0

    print(f"\nTotal Tests: {total}")
    print(f"Passed: {passed} ✅")
    print(f"Failed: {failed} ❌")
    print(f"Pass Rate: {pass_rate:.1f}%")

    # Performance Summary
    total_duration = sum(t['duration'] for t in suite.results['tests'])
    avg_duration = total_duration / total if total > 0 else 0
    print(f"\nTotal Duration: {total_duration:.3f}s")
    print(f"Average Test Time: {avg_duration:.3f}s")

    # Slowest Tests
    print("\nSlowest Tests:")
    slowest = sorted(suite.results['tests'], key=lambda x: x['duration'], reverse=True)[:3]
    for test in slowest:
        print(f"  {test['name']}: {test['duration']:.3f}s")

    # Save detailed results
    results_file = Path("logs") / "comprehensive_test_results.json"
    results_file.parent.mkdir(exist_ok=True)
    with open(results_file, 'w') as f:
        json.dump(suite.results, f, indent=2)
    print(f"\nDetailed results saved to: {results_file}")

    # Final Status
    print("\n" + "="*70)
    threshold = 0.8  # 80% pass rate
    if pass_rate >= threshold * 100:
        print(f"OVERALL STATUS: PASS ✅ (>= {threshold*100}% required)")
        return True
    else:
        print(f"OVERALL STATUS: FAIL ❌ (< {threshold*100}% required)")
        return False


if __name__ == "__main__":
    success = run_comprehensive_tests()
    sys.exit(0 if success else 1)
