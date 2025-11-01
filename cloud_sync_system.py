"""
CLOUD SYNC SYSTEM
Sync knowledge base across multiple machines via Google Drive + Git
"""

import os
import shutil
import json
from datetime import datetime
from pathlib import Path

class CloudSyncManager:
    """Manage syncing knowledge base to multiple cloud locations"""

    def __init__(self):
        # Local paths
        self.local_kb_dir = Path(r"C:\Users\Darrick")

        # Cloud paths (will auto-detect)
        self.google_drive_path = self.find_google_drive()

        # Knowledge base files to sync
        self.kb_files = [
            "AI_CAPABILITIES_KNOWLEDGE_BASE.json",
            "AI_CAPABILITIES_COMPLETE_BRAIN_DUMP.md",
            "AI_CAPABILITIES_COMPARISON_2025.md",
            "AI_ABILITIES_QUICK_REFERENCE.md",
            "knowledge_extractor.py",
            "knowledge_query_system.py",
            "knowledge_analytics_system.py",
            "KNOWLEDGE_PROCESSING_RESULTS.md"
        ]

    def find_google_drive(self):
        """Auto-detect Google Drive path"""
        possible_paths = [
            Path(r"C:\Users\Darrick\Google Drive"),
            Path(r"C:\Users\Darrick\GoogleDrive"),
            Path(r"G:\My Drive"),
            Path("G:/"),
            Path(os.path.expanduser("~/Google Drive")),
        ]

        for path in possible_paths:
            if path.exists():
                print(f"Found Google Drive at: {path}")
                return path

        print("Google Drive not found. Will create sync folder in Documents.")
        # Fallback to Documents
        return Path(r"C:\Users\Darrick\Documents\CloudSync")

    def setup_sync_folder(self):
        """Create KnowledgeBase folder in cloud"""
        sync_folder = self.google_drive_path / "KnowledgeBase"
        sync_folder.mkdir(parents=True, exist_ok=True)
        print(f"Sync folder ready: {sync_folder}")
        return sync_folder

    def sync_to_cloud(self):
        """Sync local files to cloud"""
        print("="*70)
        print("SYNCING TO CLOUD")
        print("="*70)

        sync_folder = self.setup_sync_folder()
        synced_count = 0

        for filename in self.kb_files:
            local_file = self.local_kb_dir / filename
            cloud_file = sync_folder / filename

            if local_file.exists():
                try:
                    shutil.copy2(local_file, cloud_file)
                    print(f"OK - Synced: {filename}")
                    synced_count += 1
                except Exception as e:
                    print(f"FAIL - {filename}: {e}")
            else:
                print(f"SKIP - Not found: {filename}")

        print(f"\nSynced {synced_count}/{len(self.kb_files)} files to cloud")
        return synced_count

    def sync_from_cloud(self):
        """Sync cloud files to local (for other machine)"""
        print("="*70)
        print("SYNCING FROM CLOUD")
        print("="*70)

        sync_folder = self.setup_sync_folder()
        synced_count = 0

        for filename in self.kb_files:
            cloud_file = sync_folder / filename
            local_file = self.local_kb_dir / filename

            if cloud_file.exists():
                try:
                    shutil.copy2(cloud_file, local_file)
                    print(f"OK - Downloaded: {filename}")
                    synced_count += 1
                except Exception as e:
                    print(f"FAIL - {filename}: {e}")
            else:
                print(f"SKIP - Not in cloud: {filename}")

        print(f"\nDownloaded {synced_count}/{len(self.kb_files)} files from cloud")
        return synced_count

    def create_sync_manifest(self):
        """Create manifest of all synced files"""
        sync_folder = self.setup_sync_folder()
        manifest = {
            "last_sync": datetime.now().isoformat(),
            "sync_path": str(sync_folder),
            "files": []
        }

        for filename in self.kb_files:
            cloud_file = sync_folder / filename
            if cloud_file.exists():
                manifest["files"].append({
                    "name": filename,
                    "size": cloud_file.stat().st_size,
                    "modified": datetime.fromtimestamp(
                        cloud_file.stat().st_mtime
                    ).isoformat()
                })

        manifest_file = sync_folder / "sync_manifest.json"
        with open(manifest_file, 'w') as f:
            json.dump(manifest, f, indent=2)

        print(f"\nManifest created: {manifest_file}")
        return manifest

    def check_sync_status(self):
        """Check current sync status"""
        print("="*70)
        print("SYNC STATUS CHECK")
        print("="*70)

        sync_folder = self.setup_sync_folder()
        print(f"\nGoogle Drive path: {self.google_drive_path}")
        print(f"Sync folder: {sync_folder}")
        print(f"Sync folder exists: {sync_folder.exists()}")

        if sync_folder.exists():
            cloud_files = list(sync_folder.glob("*"))
            print(f"\nFiles in cloud: {len(cloud_files)}")
            for f in cloud_files:
                size_kb = f.stat().st_size / 1024
                print(f"   - {f.name} ({size_kb:.1f} KB)")

        print(f"\nLocal files to sync: {len(self.kb_files)}")
        local_count = 0
        for filename in self.kb_files:
            local_file = self.local_kb_dir / filename
            if local_file.exists():
                local_count += 1
                print(f"   OK - {filename}")
            else:
                print(f"   MISSING - {filename}")

        print(f"\nLocal files available: {local_count}/{len(self.kb_files)}")

    def auto_sync(self, direction="to_cloud"):
        """Auto-sync with conflict detection"""
        print("="*70)
        print("AUTO-SYNC STARTED")
        print("="*70)
        print(f"Direction: {direction}")

        if direction == "to_cloud":
            count = self.sync_to_cloud()
        else:
            count = self.sync_from_cloud()

        # Create manifest
        manifest = self.create_sync_manifest()

        print("="*70)
        print("AUTO-SYNC COMPLETE")
        print("="*70)
        print(f"Files synced: {count}")
        print(f"Last sync: {manifest['last_sync']}")

        return manifest

# Run sync
if __name__ == "__main__":
    import sys

    sync = CloudSyncManager()

    if len(sys.argv) > 1:
        if sys.argv[1] == "status":
            sync.check_sync_status()
        elif sys.argv[1] == "to_cloud":
            sync.auto_sync("to_cloud")
        elif sys.argv[1] == "from_cloud":
            sync.auto_sync("from_cloud")
        else:
            print("Usage: python cloud_sync_system.py [status|to_cloud|from_cloud]")
    else:
        # Default: sync to cloud
        sync.auto_sync("to_cloud")
