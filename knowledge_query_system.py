"""
KNOWLEDGE QUERY SYSTEM
Test the knowledge base with various queries
"""

import json

class KnowledgeQuery:
    """Query system for the knowledge base"""

    def __init__(self, kb_path):
        self.kb_path = kb_path
        self.kb = self.load_kb()

    def load_kb(self):
        """Load knowledge base"""
        with open(self.kb_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def get_by_id(self, cap_id):
        """Get capability by ID"""
        all_caps = self.kb['capabilities']['all']
        return all_caps.get(cap_id)

    def get_by_status(self, status):
        """Get all capabilities by status"""
        indexes = self.kb['indexes']['by_status']
        cap_ids = indexes.get(status, [])
        all_caps = self.kb['capabilities']['all']
        return [all_caps[cid] for cid in cap_ids if cid in all_caps]

    def get_by_priority(self, priority):
        """Get all capabilities by priority"""
        indexes = self.kb['indexes']['by_priority']
        cap_ids = indexes.get(priority, [])
        all_caps = self.kb['capabilities']['all']
        return [all_caps[cid] for cid in cap_ids if cid in all_caps]

    def get_by_timeline(self, timeline):
        """Get capabilities by timeline"""
        indexes = self.kb['indexes']['by_timeline']
        cap_ids = indexes.get(timeline, [])
        all_caps = self.kb['capabilities']['all']
        return [all_caps[cid] for cid in cap_ids if cid in all_caps]

    def get_by_category(self, category):
        """Get all capabilities in a category"""
        indexes = self.kb['indexes']['by_category']
        cap_ids = indexes.get(category, [])
        all_caps = self.kb['capabilities']['all']
        return [all_caps[cid] for cid in cap_ids if cid in all_caps]

    def search_by_name(self, name):
        """Search for capability by name"""
        name_lower = name.lower()
        all_caps = self.kb['capabilities']['all']

        results = []
        for cap in all_caps.values():
            if name_lower in cap['name'].lower():
                results.append(cap)

        return results

    def get_quick_wins(self, max_weeks=1):
        """Get capabilities that can be done quickly"""
        all_caps = self.kb['capabilities']['all']
        quick_wins = []

        for cap in all_caps.values():
            if 'timeline' in cap:
                timeline = cap['timeline'].lower()
                # Look for day mentions or short week mentions
                if 'day' in timeline or (week_match := timeline.split() if 'week' in timeline else None):
                    if 'day' in timeline:
                        quick_wins.append(cap)
                    elif week_match and len(week_match) > 0:
                        # Try to extract number of weeks
                        for i, word in enumerate(week_match):
                            if 'week' in word and i > 0:
                                try:
                                    weeks = int(week_match[i-1].split('-')[0])
                                    if weeks <= max_weeks:
                                        quick_wins.append(cap)
                                        break
                                except:
                                    pass

        return quick_wins

    def print_capability(self, cap):
        """Pretty print a capability"""
        print(f"\n{cap['id']}: {cap['name']}")
        print(f"   Category: {cap.get('category', 'Unknown')}")
        print(f"   Status: {cap.get('status', 'Unknown')}")

        if 'priority' in cap:
            print(f"   Priority: {cap['priority'].upper()}")

        if 'timeline' in cap:
            print(f"   Timeline: {cap['timeline']}")

        if 'description' in cap:
            print(f"   Description: {cap['description']}")

        if 'impact' in cap:
            print(f"   Impact: {cap['impact']}")

    def run_tests(self):
        """Run all test queries"""

        print("="*70)
        print("KNOWLEDGE BASE QUERY SYSTEM - TESTING")
        print("="*70)

        # TEST 1: Get specific capability
        print("\nTEST 1: Get 'Recursive Self-Improvement' capability")
        print("-"*70)
        results = self.search_by_name("Recursive Self-Improvement")
        if results:
            self.print_capability(results[0])
            print("PASS - Found capability")
        else:
            print("FAIL - Not found")

        # TEST 2: Get all missing capabilities
        print("\n\nTEST 2: Get all MISSING capabilities")
        print("-"*70)
        missing = self.get_by_status("missing")
        print(f"Found {len(missing)} missing capabilities")
        if missing:
            print("\nFirst 5:")
            for cap in missing[:5]:
                print(f"   - {cap['name']} ({cap.get('priority', 'no priority')} priority)")
            print("PASS")
        else:
            print("FAIL")

        # TEST 3: Get all HIGH priority capabilities
        print("\n\nTEST 3: Get all HIGH priority capabilities")
        print("-"*70)
        high_priority = self.get_by_priority("high")
        print(f"Found {len(high_priority)} high priority capabilities")
        if high_priority:
            print("\nAll HIGH priority items:")
            for cap in high_priority:
                timeline = cap.get('timeline', 'unknown')
                print(f"   - {cap['name']} (Timeline: {timeline})")
            print("PASS")
        else:
            print("FAIL")

        # TEST 4: Get quick wins (<1 week)
        print("\n\nTEST 4: Get capabilities buildable in under 1 week")
        print("-"*70)
        quick_wins = self.get_quick_wins(max_weeks=1)
        print(f"Found {len(quick_wins)} quick win capabilities")
        if quick_wins:
            print("\nQuick wins:")
            for cap in quick_wins[:10]:
                print(f"   - {cap['name']} ({cap.get('timeline', 'unknown')})")
            print("PASS")
        else:
            print("FAIL")

        # TEST 5: Get by category
        print("\n\nTEST 5: Get all 'Self-Improvement' capabilities")
        print("-"*70)
        category_caps = self.get_by_category("Missing Capabilities")
        print(f"Found {len(category_caps)} capabilities in 'Missing Capabilities'")
        if category_caps:
            print("\nFirst 5:")
            for cap in category_caps[:5]:
                print(f"   - {cap['name']}")
            print("PASS")
        else:
            print("FAIL")

        # TEST 6: Search by keyword
        print("\n\nTEST 6: Search for 'Vision' capabilities")
        print("-"*70)
        vision_caps = self.search_by_name("vision")
        print(f"Found {len(vision_caps)} capabilities with 'vision' in name")
        if vision_caps:
            for cap in vision_caps:
                print(f"   - {cap['name']} ({cap.get('status', 'unknown')} status)")
            print("PASS")
        else:
            print("FAIL")

        # SUMMARY
        print("\n" + "="*70)
        print("KNOWLEDGE BASE STATISTICS")
        print("="*70)
        stats = self.kb['statistics']
        print(f"Total Capabilities: {stats['total']}")
        print(f"   Current (Complete): {stats['current_capabilities']}")
        print(f"   Missing: {stats['missing_capabilities']}")
        print(f"   Partial: {stats['partial_capabilities']}")
        print(f"   External: {stats['external_capabilities']}")

        print("\n" + "="*70)
        print("INDEX STATISTICS")
        print("="*70)
        indexes = self.kb['indexes']
        print(f"Statuses tracked: {len(indexes['by_status'])}")
        print(f"   Statuses: {list(indexes['by_status'].keys())}")
        print(f"Priorities tracked: {len(indexes['by_priority'])}")
        print(f"   Priorities: {list(indexes['by_priority'].keys())}")
        print(f"Categories tracked: {len(indexes['by_category'])}")
        print(f"   Top categories: {list(indexes['by_category'].keys())[:5]}")

        print("\n" + "="*70)
        print("ALL TESTS COMPLETE!")
        print("="*70)

# Run the tests
if __name__ == "__main__":
    kb_path = r"C:\Users\Darrick\AI_CAPABILITIES_KNOWLEDGE_BASE.json"

    query = KnowledgeQuery(kb_path)
    query.run_tests()
