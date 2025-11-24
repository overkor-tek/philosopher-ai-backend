#!/usr/bin/env python3
"""
Test script for Voice Interface V3
Tests the production integration without interactive input
"""

import sys
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from voice_interface_v3_production import VoiceInterfaceV3, Config
    print("[OK] Voice Interface V3 imported successfully")
except ImportError as e:
    print(f"[ERROR] Failed to import Voice Interface V3: {e}")
    sys.exit(1)


def test_voice_interface_v3():
    """Test Voice Interface V3 functionality"""

    print("\n" + "="*70)
    print("VOICE INTERFACE V3 - PRODUCTION TEST")
    print("="*70)

    # Initialize
    print("\n[TEST 1] Initializing Voice Interface V3...")
    try:
        config = Config()
        print(f"[OK] Config created")
        print(f"     Storage path: {config.storage_path}")
        print(f"     Platform: {'Windows' if config.is_windows else 'Linux/Unix'}")

        interface = VoiceInterfaceV3(config)
        print("[OK] Interface initialized")
    except Exception as e:
        print(f"[FAIL] Initialization failed: {e}")
        return False

    # Load knowledge base
    print("\n[TEST 2] Loading knowledge base...")
    try:
        kb_size = interface.initialize_knowledge_base()
        print(f"[OK] Knowledge base loaded: {kb_size} items")

        if kb_size == 0:
            print("[WARN] Knowledge base is empty")
    except Exception as e:
        print(f"[FAIL] Knowledge base loading failed: {e}")
        return False

    # Test queries
    test_queries = [
        "What is Trinity?",
        "Show me session reports",
        "Find voice interface files",
        "What frameworks exist?",
    ]

    print("\n[TEST 3] Processing test queries...")
    success_count = 0
    for i, query in enumerate(test_queries, 1):
        print(f"\n  Query {i}/{len(test_queries)}: {query}")
        try:
            result = interface.process_query(query)

            if result['success']:
                num_results = len(result.get('results', []))
                print(f"  [OK] Results: {num_results} found")
                print(f"  Response preview: {result['response'][:100]}...")
                success_count += 1
            else:
                print(f"  [FAIL] Query failed: {result.get('error', 'Unknown')}")

        except Exception as e:
            print(f"  [FAIL] Query processing error: {e}")

    print(f"\n  Summary: {success_count}/{len(test_queries)} queries successful")

    # Test stats
    print("\n[TEST 4] Retrieving system statistics...")
    try:
        stats = interface.get_stats()
        print("[OK] System Statistics:")
        for key, value in stats.items():
            print(f"     {key}: {value}")
    except Exception as e:
        print(f"[FAIL] Stats retrieval failed: {e}")

    # Test history saving
    print("\n[TEST 5] Saving query history...")
    try:
        history_file = interface.save_history("test_history.json")
        if history_file:
            print(f"[OK] History saved to: {history_file}")
        else:
            print("[INFO] No history to save")
    except Exception as e:
        print(f"[FAIL] History saving failed: {e}")

    # Final summary
    print("\n" + "="*70)
    print("TEST COMPLETE")
    print("="*70)

    total_queries = len(interface.query_history)
    print(f"\nTotal queries processed: {total_queries}")
    print(f"Knowledge base size: {interface.knowledge_base_size}")
    print(f"Success rate: {success_count}/{len(test_queries)} queries")

    overall_success = success_count >= len(test_queries) * 0.75  # 75% success threshold
    print(f"\nOverall Status: {'PASS ✅' if overall_success else 'FAIL ❌'}")

    return overall_success


if __name__ == "__main__":
    success = test_voice_interface_v3()
    sys.exit(0 if success else 1)
