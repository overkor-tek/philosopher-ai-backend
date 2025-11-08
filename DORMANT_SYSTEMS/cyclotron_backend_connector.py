#!/usr/bin/env python3
"""
🌪️ DATA CYCLOTRON - BACKEND CONNECTOR
Connects the cyclotron to the live Railway PostgreSQL backend
"""

import os
import json
import requests
from datetime import datetime
from typing import Dict, List, Optional

# ========================================
# CONFIGURATION
# ========================================

class BackendConfig:
    """Backend connection configuration"""

    # Set your backend URL here (from: railway domain)
    BACKEND_URL = os.getenv('CYCLOTRON_BACKEND_URL', 'https://philosopher-ai-backend-production.up.railway.app')

    # API endpoints
    ENDPOINTS = {
        'health': '/api/v1/health',
        'knowledge_create': '/api/v1/knowledge',
        'knowledge_search': '/api/v1/knowledge/search',
        'knowledge_category': '/api/v1/knowledge/category',
        'knowledge_recent': '/api/v1/knowledge/recent',
        'metrics': '/api/v1/metrics'
    }

    # Authentication (will be added to backend)
    API_KEY = os.getenv('CYCLOTRON_API_KEY', '')

# ========================================
# BACKEND CONNECTOR
# ========================================

class CyclotronBackendConnector:
    """Connect cyclotron to PostgreSQL backend"""

    def __init__(self, backend_url: str = None):
        self.backend_url = backend_url or BackendConfig.BACKEND_URL
        self.api_key = BackendConfig.API_KEY
        self.session = requests.Session()

        # Set headers
        if self.api_key:
            self.session.headers.update({
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            })
        else:
            self.session.headers.update({
                'Content-Type': 'application/json'
            })

    def check_health(self) -> bool:
        """Check if backend is healthy"""
        try:
            url = f"{self.backend_url}{BackendConfig.ENDPOINTS['health']}"
            response = self.session.get(url, timeout=5)

            if response.status_code == 200:
                data = response.json()
                print(f"[OK] Backend healthy: {data}")
                return True
            else:
                print(f"[ERROR] Backend unhealthy: {response.status_code}")
                return False

        except Exception as e:
            print(f"[ERROR] Backend connection failed: {e}")
            return False

    def store_knowledge(self, knowledge: Dict) -> bool:
        """Store extracted knowledge in backend database"""
        try:
            url = f"{self.backend_url}{BackendConfig.ENDPOINTS['knowledge_create']}"

            # Prepare knowledge payload
            payload = {
                'title': knowledge.get('title', ''),
                'content': knowledge.get('content', knowledge.get('summary', '')),
                'source': knowledge.get('source', 'cyclotron'),
                'source_url': knowledge.get('link', ''),
                'categories': knowledge.get('categories', []),
                'keywords': knowledge.get('keywords', []),
                'priority_score': knowledge.get('priority_score', 50),
                'metadata': {
                    'turbo1_rpm': knowledge.get('turbo1_rpm'),
                    'turbo2_rpm': knowledge.get('turbo2_rpm'),
                    'turbo3_rpm': knowledge.get('turbo3_rpm'),
                    'extracted_at': knowledge.get('extracted_at'),
                    'file_type': knowledge.get('file_type'),
                    'relationships': knowledge.get('relationships', [])
                }
            }

            response = self.session.post(url, json=payload, timeout=10)

            if response.status_code in [200, 201]:
                print(f"[OK] Stored: {knowledge.get('title', 'Untitled')[:50]}")
                return True
            else:
                print(f"[ERROR] Storage failed: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            print(f"[ERROR] Storage error: {e}")
            return False

    def search_knowledge(self, query: str, limit: int = 10) -> List[Dict]:
        """Search knowledge with natural language"""
        try:
            url = f"{self.backend_url}{BackendConfig.ENDPOINTS['knowledge_search']}"
            params = {'q': query, 'limit': limit}

            response = self.session.get(url, params=params, timeout=10)

            if response.status_code == 200:
                results = response.json()
                print(f"[OK] Found {len(results)} results for: {query}")
                return results
            else:
                print(f"[ERROR] Search failed: {response.status_code}")
                return []

        except Exception as e:
            print(f"[ERROR] Search error: {e}")
            return []

    def get_by_category(self, category: str, limit: int = 20) -> List[Dict]:
        """Get knowledge by category"""
        try:
            url = f"{self.backend_url}{BackendConfig.ENDPOINTS['knowledge_category']}/{category}"
            params = {'limit': limit}

            response = self.session.get(url, params=params, timeout=10)

            if response.status_code == 200:
                results = response.json()
                print(f"[OK] Found {len(results)} items in category: {category}")
                return results
            else:
                print(f"[ERROR] Category fetch failed: {response.status_code}")
                return []

        except Exception as e:
            print(f"[ERROR] Category error: {e}")
            return []

    def get_recent(self, limit: int = 20) -> List[Dict]:
        """Get recent knowledge items"""
        try:
            url = f"{self.backend_url}{BackendConfig.ENDPOINTS['knowledge_recent']}"
            params = {'limit': limit}

            response = self.session.get(url, params=params, timeout=10)

            if response.status_code == 200:
                results = response.json()
                print(f"[OK] Retrieved {len(results)} recent items")
                return results
            else:
                print(f"[ERROR] Recent fetch failed: {response.status_code}")
                return []

        except Exception as e:
            print(f"[ERROR] Recent error: {e}")
            return []

    def get_metrics(self) -> Dict:
        """Get cyclotron metrics from backend"""
        try:
            url = f"{self.backend_url}{BackendConfig.ENDPOINTS['metrics']}"

            response = self.session.get(url, timeout=10)

            if response.status_code == 200:
                metrics = response.json()
                print("[OK] Metrics retrieved")
                return metrics
            else:
                print(f"[ERROR] Metrics fetch failed: {response.status_code}")
                return {}

        except Exception as e:
            print(f"[ERROR] Metrics error: {e}")
            return {}

# ========================================
# BATCH OPERATIONS
# ========================================

class BatchProcessor:
    """Process multiple knowledge items efficiently"""

    def __init__(self, connector: CyclotronBackendConnector):
        self.connector = connector

    def upload_json_file(self, json_file_path: str) -> bool:
        """Upload a single JSON knowledge file to backend"""
        try:
            with open(json_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Handle different JSON formats
            if 'concepts' in data:
                # This is from the supercharger (multiple concepts)
                for concept in data['concepts']:
                    self.connector.store_knowledge(concept)
            else:
                # This is from the file watcher (single item)
                self.connector.store_knowledge(data)

            return True

        except Exception as e:
            print(f"[ERROR] Upload failed for {json_file_path}: {e}")
            return False

    def upload_directory(self, directory_path: str) -> Dict:
        """Upload all JSON files from a directory"""
        import glob
        from pathlib import Path

        json_files = glob.glob(f"{directory_path}/*.json")

        results = {
            'total': len(json_files),
            'success': 0,
            'failed': 0
        }

        print(f"\nUploading {len(json_files)} JSON files to backend...")
        print("=" * 60)

        for json_file in json_files:
            filename = Path(json_file).name
            print(f"\nProcessing: {filename}")

            if self.upload_json_file(json_file):
                results['success'] += 1
                print(f"   [OK] Success")
            else:
                results['failed'] += 1
                print(f"   [FAIL] Failed")

        print("\n" + "=" * 60)
        print(f"UPLOAD COMPLETE:")
        print(f"   Total: {results['total']}")
        print(f"   Success: {results['success']}")
        print(f"   Failed: {results['failed']}")
        print("=" * 60)

        return results

# ========================================
# UTILITY FUNCTIONS
# ========================================

def test_connection(backend_url: str = None):
    """Test backend connection"""
    print("\nTESTING BACKEND CONNECTION")
    print("=" * 60)

    connector = CyclotronBackendConnector(backend_url)

    print(f"\nBackend URL: {connector.backend_url}")
    print("\nChecking health endpoint...")

    if connector.check_health():
        print("\n[OK] Backend is ONLINE and ready!")
        return True
    else:
        print("\n[ERROR] Backend is not responding")
        print("\nTroubleshooting:")
        print("1. Make sure you set the backend URL:")
        print("   export CYCLOTRON_BACKEND_URL=https://your-backend.railway.app")
        print("\n2. Or edit this file and set BackendConfig.BACKEND_URL")
        print("\n3. Check that your backend is deployed:")
        print("   railway status")
        return False

def migrate_local_to_backend(storage_dir: str = "C:/Users/Darrick/DATA_CYCLOTRON_STORAGE"):
    """Migrate all local JSON knowledge to backend"""
    print("\nMIGRATING LOCAL KNOWLEDGE TO BACKEND")
    print("=" * 60)

    connector = CyclotronBackendConnector()

    # Check connection first
    if not connector.check_health():
        print("\n[ERROR] Backend not available. Migration aborted.")
        return

    # Upload all JSON files
    processor = BatchProcessor(connector)
    results = processor.upload_directory(storage_dir)

    if results['success'] > 0:
        print(f"\n[OK] Successfully migrated {results['success']} knowledge items!")

    return results

# ========================================
# MAIN (FOR TESTING)
# ========================================

if __name__ == "__main__":
    import sys

    print("\n" + "=" * 60)
    print("DATA CYCLOTRON - BACKEND CONNECTOR")
    print("=" * 60)

    # Get backend URL from command line or environment
    if len(sys.argv) > 1:
        backend_url = sys.argv[1]
    else:
        backend_url = os.getenv('CYCLOTRON_BACKEND_URL', BackendConfig.BACKEND_URL)

    print(f"\nBackend: {backend_url}")

    # Test connection
    if test_connection(backend_url):
        print("\nReady to connect cyclotron to backend!")

        # Example usage
        print("\nUSAGE EXAMPLES:")
        print("=" * 60)
        print("\n# Test connection:")
        print("python cyclotron_backend_connector.py https://your-backend.railway.app")

        print("\n# In Python:")
        print("from cyclotron_backend_connector import CyclotronBackendConnector")
        print("")
        print("connector = CyclotronBackendConnector()")
        print("connector.check_health()")
        print("connector.search_knowledge('AI and machine learning')")
        print("connector.get_by_category('AI/ML')")
        print("connector.get_recent(10)")

        print("\n# Migrate existing knowledge:")
        print("from cyclotron_backend_connector import migrate_local_to_backend")
        print("migrate_local_to_backend()")

    else:
        print("\nSet your backend URL first!")
        print("\nOption 1 - Environment variable:")
        print("export CYCLOTRON_BACKEND_URL=https://your-backend.railway.app")
        print("\nOption 2 - Edit this file:")
        print("BACKEND_URL = 'https://your-backend.railway.app'")
        print("\nOption 3 - Command line:")
        print("python cyclotron_backend_connector.py https://your-backend.railway.app")
