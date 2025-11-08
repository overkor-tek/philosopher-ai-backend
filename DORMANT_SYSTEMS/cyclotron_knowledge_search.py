#!/usr/bin/env python3
"""
🌪️ DATA CYCLOTRON - KNOWLEDGE SEARCH
Query and search the circular buffer
"""

import os
import json
import glob
from datetime import datetime
from typing import List, Dict, Optional
from pathlib import Path

# ========================================
# CONFIGURATION
# ========================================

STORAGE_DIR = "C:/Users/Darrick/DATA_CYCLOTRON_STORAGE"

# ========================================
# KNOWLEDGE INDEX
# ========================================

class KnowledgeIndex:
    """Index and search knowledge items"""

    def __init__(self, storage_dir: str = STORAGE_DIR):
        self.storage_dir = storage_dir
        self.knowledge_items = []
        self.categories_index = {}
        self.keywords_index = {}
        self.source_index = {}

    def load_all(self):
        """Load all knowledge from JSON files"""
        print(f"\nLoading knowledge from: {self.storage_dir}")
        print("=" * 60)

        json_files = glob.glob(f"{self.storage_dir}/*.json")

        if not json_files:
            print("No knowledge files found")
            return 0

        print(f"Found {len(json_files)} knowledge files")

        loaded = 0
        for json_file in json_files:
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                # Handle different formats
                if 'concepts' in data:
                    # Supercharger format (multiple concepts)
                    for concept in data['concepts']:
                        self._add_to_index(concept)
                        loaded += 1
                else:
                    # File watcher format (single item)
                    self._add_to_index(data)
                    loaded += 1

            except Exception as e:
                print(f"Error loading {json_file}: {e}")

        print(f"[OK] Loaded {loaded} knowledge items")
        print("=" * 60)

        return loaded

    def _add_to_index(self, item: Dict):
        """Add item to all indexes"""
        self.knowledge_items.append(item)

        # Category index
        categories = item.get('categories', item.get('category', []))
        if isinstance(categories, str):
            categories = [categories]

        for category in categories:
            if category not in self.categories_index:
                self.categories_index[category] = []
            self.categories_index[category].append(item)

        # Keyword index
        keywords = item.get('keywords', [])
        for keyword in keywords:
            if keyword not in self.keywords_index:
                self.keywords_index[keyword] = []
            self.keywords_index[keyword].append(item)

        # Source index
        source = item.get('source', 'unknown')
        if source not in self.source_index:
            self.source_index[source] = []
        self.source_index[source].append(item)

    def search(self, query: str) -> List[Dict]:
        """Search knowledge with natural language query"""
        query_lower = query.lower()
        results = []

        for item in self.knowledge_items:
            # Search in title
            title = item.get('title', '').lower()
            if query_lower in title:
                item['_match_score'] = 100
                results.append(item)
                continue

            # Search in content/summary
            content = item.get('content', item.get('summary', '')).lower()
            if query_lower in content:
                item['_match_score'] = 80
                results.append(item)
                continue

            # Search in keywords
            keywords = [k.lower() for k in item.get('keywords', [])]
            if any(query_lower in k for k in keywords):
                item['_match_score'] = 60
                results.append(item)
                continue

        # Sort by match score
        results.sort(key=lambda x: x.get('_match_score', 0), reverse=True)

        return results

    def get_by_category(self, category: str) -> List[Dict]:
        """Get all items in a category"""
        return self.categories_index.get(category, [])

    def get_by_keyword(self, keyword: str) -> List[Dict]:
        """Get all items with a keyword"""
        return self.keywords_index.get(keyword, [])

    def get_by_source(self, source: str) -> List[Dict]:
        """Get all items from a source"""
        return self.source_index.get(source, [])

    def get_recent(self, limit: int = 20) -> List[Dict]:
        """Get most recent items"""
        # Sort by extracted_at timestamp
        sorted_items = sorted(
            self.knowledge_items,
            key=lambda x: x.get('extracted_at', ''),
            reverse=True
        )
        return sorted_items[:limit]

    def get_high_priority(self, min_score: int = 70) -> List[Dict]:
        """Get high priority items"""
        high_priority = [
            item for item in self.knowledge_items
            if item.get('priority_score', 0) >= min_score
        ]

        # Sort by priority score
        high_priority.sort(key=lambda x: x.get('priority_score', 0), reverse=True)

        return high_priority

    def get_statistics(self) -> Dict:
        """Get knowledge base statistics"""
        return {
            'total_items': len(self.knowledge_items),
            'categories': {
                cat: len(items)
                for cat, items in self.categories_index.items()
            },
            'top_keywords': self._get_top_keywords(10),
            'sources': {
                src: len(items)
                for src, items in self.source_index.items()
            }
        }

    def _get_top_keywords(self, limit: int = 10) -> List[tuple]:
        """Get most common keywords"""
        keyword_counts = [
            (keyword, len(items))
            for keyword, items in self.keywords_index.items()
        ]
        keyword_counts.sort(key=lambda x: x[1], reverse=True)
        return keyword_counts[:limit]

# ========================================
# QUERY INTERFACE
# ========================================

class QueryInterface:
    """User-friendly query interface"""

    def __init__(self):
        self.index = KnowledgeIndex()
        self.index.load_all()

    def query(self, text: str):
        """Natural language query"""
        print(f"\n🔍 Query: {text}")
        print("=" * 60)

        results = self.index.search(text)

        if not results:
            print("[!] No results found")
            return []

        print(f"[OK] Found {len(results)} results\n")

        # Display results
        for i, result in enumerate(results[:10], 1):  # Top 10
            title = result.get('title', 'Untitled')[:60]
            score = result.get('_match_score', 0)
            priority = result.get('priority_score', 0)
            categories = result.get('categories', result.get('category', []))

            if isinstance(categories, str):
                categories = [categories]

            print(f"{i}. {title}")
            print(f"   Match: {score}% | Priority: {priority}/100 | Categories: {', '.join(categories)}")
            print()

        return results

    def category(self, category_name: str):
        """Get by category"""
        print(f"\n📂 Category: {category_name}")
        print("=" * 60)

        results = self.index.get_by_category(category_name)

        if not results:
            print(f"❌ No items in category: {category_name}")
            return []

        print(f"✅ Found {len(results)} items\n")

        for i, result in enumerate(results[:10], 1):  # Top 10
            title = result.get('title', 'Untitled')[:60]
            priority = result.get('priority_score', 0)

            print(f"{i}. {title}")
            print(f"   Priority: {priority}/100")
            print()

        return results

    def recent(self, limit: int = 10):
        """Get recent items"""
        print(f"\n⏰ Recent {limit} items")
        print("=" * 60)

        results = self.index.get_recent(limit)

        if not results:
            print("❌ No items found")
            return []

        print(f"✅ Showing {len(results)} items\n")

        for i, result in enumerate(results, 1):
            title = result.get('title', 'Untitled')[:60]
            extracted = result.get('extracted_at', 'unknown')
            categories = result.get('categories', result.get('category', []))

            if isinstance(categories, str):
                categories = [categories]

            print(f"{i}. {title}")
            print(f"   Extracted: {extracted}")
            print(f"   Categories: {', '.join(categories)}")
            print()

        return results

    def stats(self):
        """Show statistics"""
        print("\n📊 KNOWLEDGE BASE STATISTICS")
        print("=" * 60)

        stats = self.index.get_statistics()

        print(f"\n📚 Total Items: {stats['total_items']}")

        print(f"\n📂 Categories:")
        for category, count in stats['categories'].items():
            print(f"   {category}: {count} items")

        print(f"\n🔑 Top Keywords:")
        for keyword, count in stats['top_keywords']:
            print(f"   {keyword}: {count} items")

        print(f"\n📡 Sources:")
        for source, count in stats['sources'].items():
            print(f"   {source}: {count} items")

        print("\n" + "=" * 60)

        return stats

    def high_priority(self, min_score: int = 70):
        """Show high priority items"""
        print(f"\n⚡ High Priority Items (score >= {min_score})")
        print("=" * 60)

        results = self.index.get_high_priority(min_score)

        if not results:
            print(f"❌ No items with priority >= {min_score}")
            return []

        print(f"✅ Found {len(results)} high priority items\n")

        for i, result in enumerate(results[:10], 1):  # Top 10
            title = result.get('title', 'Untitled')[:60]
            priority = result.get('priority_score', 0)
            categories = result.get('categories', result.get('category', []))

            if isinstance(categories, str):
                categories = [categories]

            print(f"{i}. {title}")
            print(f"   Priority: {priority}/100")
            print(f"   Categories: {', '.join(categories)}")
            print()

        return results

# ========================================
# INTERACTIVE CLI
# ========================================

def interactive_search():
    """Interactive search interface"""
    print("\n" + "=" * 60)
    print("🌪️  DATA CYCLOTRON - KNOWLEDGE SEARCH")
    print("=" * 60)

    qi = QueryInterface()

    if qi.index.total_items == 0:
        print("\n❌ No knowledge in the system yet!")
        print("\nRun the cyclotron to build your knowledge base:")
        print("  - Start RSS Supercharger")
        print("  - Drop files into CYCLOTRON_INBOX")
        return

    while True:
        print("\n🎮 SEARCH OPTIONS:")
        print("=" * 60)
        print("[1] Search by query")
        print("[2] Browse by category")
        print("[3] Show recent items")
        print("[4] Show high priority")
        print("[5] Show statistics")
        print("[0] Exit")
        print("=" * 60)

        choice = input("\n👉 Choose an option: ").strip()

        if choice == '1':
            query = input("\n🔍 Enter search query: ").strip()
            if query:
                qi.query(query)
        elif choice == '2':
            # Show available categories
            stats = qi.index.get_statistics()
            print("\n📂 Available categories:")
            for i, (cat, count) in enumerate(stats['categories'].items(), 1):
                print(f"  {i}. {cat} ({count} items)")

            category = input("\n📂 Enter category name: ").strip()
            if category:
                qi.category(category)
        elif choice == '3':
            limit = input("\n⏰ How many recent items? [default: 10]: ").strip()
            limit = int(limit) if limit.isdigit() else 10
            qi.recent(limit)
        elif choice == '4':
            score = input("\n⚡ Minimum priority score? [default: 70]: ").strip()
            score = int(score) if score.isdigit() else 70
            qi.high_priority(score)
        elif choice == '5':
            qi.stats()
        elif choice == '0':
            print("\n🚪 Exiting search interface...")
            break
        else:
            print("\n❌ Invalid choice")

        input("\nPress ENTER to continue...")

# ========================================
# MAIN
# ========================================

if __name__ == "__main__":
    interactive_search()
