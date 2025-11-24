#!/usr/bin/env python3
"""
OVERKORE Documentation Navigator
Index and search all documentation files across the system

Created: 2025-11-24
Purpose: Consolidate and search scattered documentation
"""

import os
import json
import re
from pathlib import Path
from datetime import datetime
from typing import List, Dict

class DocumentationNavigator:
    """Navigation and search tool for all OVERKORE documentation"""

    def __init__(self):
        self.repo_root = Path(__file__).parent
        self.docs = []
        self.index = {}

    def scan_documentation(self):
        """Scan repository for all documentation files"""
        print("\n" + "="*70)
        print("SCANNING DOCUMENTATION")
        print("="*70)

        # File patterns to index
        patterns = [
            "**/*.md",
            "**/*README*",
            "**/*GUIDE*",
            "**/*COMPLETE*",
            "**/*BRIEFING*",
            "**/*REPORT*",
            "**/*STATUS*"
        ]

        # Directories to skip
        skip_dirs = {".git", "node_modules", "__pycache__", ".pytest_cache"}

        all_files = set()
        for pattern in patterns:
            files = self.repo_root.glob(pattern)
            for f in files:
                # Skip if in excluded directory
                if any(skip in f.parts for skip in skip_dirs):
                    continue
                all_files.add(f)

        print(f"\nFound {len(all_files)} documentation files")

        # Index each file
        for file_path in sorted(all_files):
            self.index_file(file_path)

        print(f"Indexed {len(self.docs)} documents")

    def index_file(self, file_path: Path):
        """Index a single documentation file"""
        try:
            stat = file_path.stat()
            modified = datetime.fromtimestamp(stat.st_mtime)

            # Read content
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            # Extract title (first heading)
            title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
            title = title_match.group(1) if title_match else file_path.name

            # Extract all headings
            headings = re.findall(r'^#{1,6}\s+(.+)$', content, re.MULTILINE)

            # Extract keywords
            keywords = self.extract_keywords(content)

            # Categorize
            category = self.categorize_doc(file_path, content)

            doc = {
                "path": str(file_path.relative_to(self.repo_root)),
                "name": file_path.name,
                "title": title,
                "category": category,
                "size_bytes": stat.st_size,
                "modified": modified.isoformat(),
                "lines": len(content.split('\n')),
                "words": len(content.split()),
                "headings": headings,
                "keywords": keywords
            }

            self.docs.append(doc)

            # Add to search index
            search_text = f"{title} {file_path.name} {' '.join(keywords)}".lower()
            self.index[file_path.name] = search_text

        except Exception as e:
            print(f"  Error indexing {file_path.name}: {e}")

    def extract_keywords(self, content: str) -> List[str]:
        """Extract important keywords from content"""
        # Common OVERKORE keywords
        important_terms = [
            "trinity", "c1", "c2", "c3", "mechanic", "architect", "oracle",
            "voice interface", "external brain", "cyclotron", "knowledge",
            "overkore", "pattern theory", "consciousness", "autonomous",
            "deployment", "api", "backend", "frontend", "database",
            "phase 1", "phase 2", "phase 3", "phase 4",
            "complete", "ready", "production", "testing"
        ]

        keywords = []
        content_lower = content.lower()

        for term in important_terms:
            if term in content_lower:
                keywords.append(term)

        return keywords

    def categorize_doc(self, file_path: Path, content: str) -> str:
        """Categorize documentation"""
        name_lower = file_path.name.lower()
        content_lower = content.lower()

        if "voice" in name_lower or "voice interface" in content_lower:
            return "Voice Interface"
        elif "trinity" in name_lower or "c1" in content_lower or "c2" in content_lower:
            return "Trinity Coordination"
        elif "overkore" in name_lower:
            return "System Overview"
        elif "deploy" in name_lower or "deployment" in content_lower:
            return "Deployment"
        elif "test" in name_lower or "testing" in content_lower:
            return "Testing"
        elif "api" in name_lower or "endpoint" in content_lower:
            return "API Documentation"
        elif "work order" in name_lower:
            return "Work Orders"
        elif "briefing" in name_lower or "report" in name_lower:
            return "Status Reports"
        elif "guide" in name_lower or "quick start" in name_lower:
            return "Guides"
        elif "complete" in name_lower or "session" in name_lower:
            return "Session Completions"
        else:
            return "General"

    def search(self, query: str) -> List[Dict]:
        """Search documentation"""
        query_lower = query.lower()
        results = []

        for doc in self.docs:
            score = 0

            # Check title
            if query_lower in doc['title'].lower():
                score += 10

            # Check filename
            if query_lower in doc['name'].lower():
                score += 5

            # Check keywords
            for keyword in doc['keywords']:
                if query_lower in keyword:
                    score += 3

            # Check category
            if query_lower in doc['category'].lower():
                score += 2

            if score > 0:
                doc_copy = doc.copy()
                doc_copy['_score'] = score
                results.append(doc_copy)

        # Sort by score
        results.sort(key=lambda x: x['_score'], reverse=True)
        return results

    def generate_index_html(self):
        """Generate HTML index of all documentation"""
        html = f"""<!DOCTYPE html>
<html>
<head>
    <title>OVERKORE Documentation Index</title>
    <style>
        body {{ font-family: monospace; margin: 40px; background: #1a1a1a; color: #00ff00; }}
        h1 {{ color: #00ff00; border-bottom: 2px solid #00ff00; }}
        h2 {{ color: #00cc00; margin-top: 30px; }}
        .doc-item {{ margin: 15px 0; padding: 10px; background: #2a2a2a; border-left: 3px solid #00ff00; }}
        .doc-title {{ font-size: 1.2em; font-weight: bold; }}
        .doc-meta {{ color: #888; font-size: 0.9em; }}
        .search-box {{ width: 100%; padding: 10px; font-size: 1.1em; background: #2a2a2a; color: #00ff00; border: 2px solid #00ff00; }}
        .category {{ display: inline-block; background: #00ff00; color: #000; padding: 3px 8px; margin: 5px 5px 5px 0; }}
        .stats {{ background: #2a2a2a; padding: 15px; margin: 20px 0; }}
    </style>
</head>
<body>
    <h1>🌀 OVERKORE Documentation Index</h1>

    <div class="stats">
        <strong>Generated:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}<br>
        <strong>Total Documents:</strong> {len(self.docs)}<br>
        <strong>Total Words:</strong> {sum(d['words'] for d in self.docs):,}<br>
        <strong>Total Lines:</strong> {sum(d['lines'] for d in self.docs):,}
    </div>

    <input type="text" class="search-box" id="searchBox" placeholder="Search documentation..." onkeyup="searchDocs()">
    <div id="results">
"""

        # Group by category
        by_category = {}
        for doc in self.docs:
            cat = doc['category']
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append(doc)

        # Generate HTML for each category
        for category in sorted(by_category.keys()):
            docs = by_category[category]
            html += f"\n<h2>{category} ({len(docs)} documents)</h2>\n"

            for doc in sorted(docs, key=lambda x: x['modified'], reverse=True):
                keywords_html = ' '.join(f'<span class="category">{k}</span>' for k in doc['keywords'][:5])
                html += f"""
<div class="doc-item" data-search="{doc['name'].lower()} {doc['title'].lower()} {' '.join(doc['keywords']).lower()}">
    <div class="doc-title"><a href="{doc['path']}" style="color: #00ff00;">{doc['title']}</a></div>
    <div class="doc-meta">
        📄 {doc['path']} |
        📝 {doc['lines']:,} lines, {doc['words']:,} words |
        🕒 {doc['modified'][:10]}
    </div>
    <div>{keywords_html}</div>
</div>
"""

        html += """
    </div>

    <script>
    function searchDocs() {
        const query = document.getElementById('searchBox').value.toLowerCase();
        const items = document.querySelectorAll('.doc-item');

        items.forEach(item => {
            const searchText = item.getAttribute('data-search');
            if (searchText.includes(query)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }
    </script>
</body>
</html>
"""

        return html

    def generate_reports(self):
        """Generate documentation reports"""
        print("\n" + "="*70)
        print("GENERATING REPORTS")
        print("="*70)

        # Save JSON index
        json_file = self.repo_root / "logs" / "documentation_index.json"
        json_file.parent.mkdir(exist_ok=True)

        with open(json_file, 'w') as f:
            json.dump({
                "generated": datetime.now().isoformat(),
                "total_documents": len(self.docs),
                "documents": self.docs
            }, f, indent=2)

        print(f"✅ JSON index: {json_file}")

        # Save HTML index
        html_file = self.repo_root / "logs" / "documentation_index.html"
        html = self.generate_index_html()

        with open(html_file, 'w') as f:
            f.write(html)

        print(f"✅ HTML index: {html_file}")
        print(f"   Open in browser to navigate documentation")

        # Print statistics
        print("\n" + "="*70)
        print("DOCUMENTATION STATISTICS")
        print("="*70)

        total_lines = sum(d['lines'] for d in self.docs)
        total_words = sum(d['words'] for d in self.docs)
        total_size = sum(d['size_bytes'] for d in self.docs) / (1024*1024)

        print(f"\nTotal Documents: {len(self.docs)}")
        print(f"Total Lines: {total_lines:,}")
        print(f"Total Words: {total_words:,}")
        print(f"Total Size: {total_size:.1f} MB")

        # By category
        print("\nBy Category:")
        by_category = {}
        for doc in self.docs:
            cat = doc['category']
            by_category[cat] = by_category.get(cat, 0) + 1

        for cat in sorted(by_category.keys()):
            count = by_category[cat]
            print(f"  {cat}: {count}")

        # Top 10 largest
        print("\nLargest Documents:")
        largest = sorted(self.docs, key=lambda x: x['words'], reverse=True)[:10]
        for i, doc in enumerate(largest, 1):
            print(f"  {i}. {doc['name']}: {doc['words']:,} words")

    def interactive_search(self):
        """Interactive search mode"""
        print("\n" + "="*70)
        print("INTERACTIVE SEARCH")
        print("="*70)
        print("\nType 'quit' to exit")

        while True:
            query = input("\n> Search: ").strip()

            if query.lower() in ['quit', 'exit', 'q']:
                break

            if not query:
                continue

            results = self.search(query)

            print(f"\nFound {len(results)} results:")
            for i, doc in enumerate(results[:20], 1):
                print(f"\n{i}. [{doc['_score']}] {doc['title']}")
                print(f"   📄 {doc['path']}")
                print(f"   📝 {doc['lines']:,} lines | 🕒 {doc['modified'][:10]}")


def main():
    """Main entry point"""
    print("\n" + "="*70)
    print("OVERKORE DOCUMENTATION NAVIGATOR")
    print("="*70)

    navigator = DocumentationNavigator()
    navigator.scan_documentation()
    navigator.generate_reports()

    # Ask if user wants interactive search
    print("\n" + "="*70)
    print("Start interactive search? (y/n)")
    response = input("> ").strip().lower()

    if response == 'y':
        navigator.interactive_search()

    print("\n✅ Documentation navigation complete")
    print(f"   View HTML index: logs/documentation_index.html")


if __name__ == "__main__":
    main()
