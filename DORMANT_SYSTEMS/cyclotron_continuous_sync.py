#!/usr/bin/env python3
"""
DATA CYCLOTRON - CONTINUOUS BACKEND SYNC
Watches for new knowledge files and auto-uploads to production backend
Enables multi-computer knowledge synchronization
"""

import os
import time
import json
from pathlib import Path
from datetime import datetime
from cyclotron_backend_connector import CyclotronBackendConnector

# Configuration
STORAGE_DIR = "C:/Users/Darrick/DATA_CYCLOTRON_STORAGE"
SYNC_INTERVAL = 30  # seconds
SYNC_LOG = "C:/Users/Darrick/DATA_CYCLOTRON_LOGS/sync_log.json"

class ContinuousSync:
    """Continuous sync to backend"""

    def __init__(self):
        self.connector = CyclotronBackendConnector()
        self.storage_dir = Path(STORAGE_DIR)
        self.sync_log_file = Path(SYNC_LOG)
        self.sync_log_file.parent.mkdir(parents=True, exist_ok=True)

        self.synced_files = self.load_sync_log()

    def load_sync_log(self):
        """Load list of already synced files"""
        if self.sync_log_file.exists():
            try:
                with open(self.sync_log_file, 'r') as f:
                    return set(json.load(f))
            except:
                pass
        return set()

    def save_sync_log(self):
        """Save sync log"""
        try:
            with open(self.sync_log_file, 'w') as f:
                json.dump(list(self.synced_files), f, indent=2)
        except Exception as e:
            print(f"Warning: Could not save sync log: {e}")

    def sync_file(self, json_file):
        """Sync a single file to backend"""
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Handle different formats
            if 'concepts' in data:
                # Supercharger format (multiple concepts)
                success_count = 0
                for concept in data['concepts']:
                    if self.connector.store_knowledge(concept):
                        success_count += 1

                if success_count > 0:
                    print(f"[OK] Synced {json_file.name}: {success_count} items")
                    return True
                else:
                    print(f"[!] Failed to sync {json_file.name}")
                    return False
            else:
                # Single item format
                if self.connector.store_knowledge(data):
                    print(f"[OK] Synced {json_file.name}")
                    return True
                else:
                    print(f"[!] Failed to sync {json_file.name}")
                    return False

        except Exception as e:
            print(f"[ERROR] Sync failed for {json_file.name}: {e}")
            return False

    def sync_new_files(self):
        """Sync all new files that haven't been synced yet"""
        json_files = list(self.storage_dir.glob("*.json"))

        new_files = [
            f for f in json_files
            if f.name not in self.synced_files
        ]

        if not new_files:
            return 0

        print(f"\n[SYNC] Found {len(new_files)} new files to sync")

        synced_count = 0
        for json_file in new_files:
            if self.sync_file(json_file):
                self.synced_files.add(json_file.name)
                synced_count += 1

        if synced_count > 0:
            self.save_sync_log()
            print(f"[OK] Synced {synced_count}/{len(new_files)} files")

        return synced_count

    def run_continuous(self, interval=SYNC_INTERVAL):
        """Run continuous sync loop"""
        print("\n" + "=" * 70)
        print("DATA CYCLOTRON - CONTINUOUS BACKEND SYNC")
        print("=" * 70)
        print(f"Storage: {self.storage_dir}")
        print(f"Backend: {self.connector.backend_url}")
        print(f"Sync interval: {interval} seconds")
        print("\nPress Ctrl+C to stop")
        print("=" * 70)

        # Test backend connection first
        if not self.connector.test_connection():
            print("\n[ERROR] Backend not reachable! Check connection.")
            return

        print(f"\nAlready synced: {len(self.synced_files)} files")

        try:
            while True:
                timestamp = datetime.now().strftime("%H:%M:%S")
                print(f"\n[{timestamp}] Checking for new files...")

                synced = self.sync_new_files()

                if synced > 0:
                    print(f"[OK] Multi-computer sync ACTIVE - knowledge flowing!")
                else:
                    print(f"[OK] No new files - standing by")

                time.sleep(interval)

        except KeyboardInterrupt:
            print("\n\n[STOP] Continuous sync stopped by user")
            print(f"Total files synced this session: {len(self.synced_files)}")
            self.save_sync_log()

def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="Data Cyclotron Continuous Sync")
    parser.add_argument('--interval', type=int, default=SYNC_INTERVAL,
                       help='Sync interval in seconds (default: 30)')
    parser.add_argument('--once', action='store_true',
                       help='Sync once and exit')

    args = parser.parse_args()

    syncer = ContinuousSync()

    if args.once:
        # One-time sync
        print("\n[SYNC] Running one-time sync...")
        synced = syncer.sync_new_files()
        print(f"\n[DONE] Synced {synced} files")
        syncer.save_sync_log()
    else:
        # Continuous sync
        syncer.run_continuous(interval=args.interval)

if __name__ == "__main__":
    main()
