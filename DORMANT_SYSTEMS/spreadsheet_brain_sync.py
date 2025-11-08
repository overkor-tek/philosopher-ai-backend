#!/usr/bin/env python3
"""
SPREADSHEET BRAIN CLOUD SYNC
Auto-syncs all .xlsx files to Google Sheets or local cloud
Runs autonomously, no manual intervention needed
"""

import os
import sys
import time
import json
import hashlib
from pathlib import Path
from datetime import datetime

# Configuration
SYNC_INTERVAL = 300  # 5 minutes
SPREADSHEET_DIRS = [
    Path("C:/Users/Darrick/DATA_SYSTEMS"),
    Path("C:/Users/Darrick/100X_BACKUP/100X_DEPLOYMENT"),
    Path("C:/Users/Darrick")
]

class SpreadsheetBrainSync:
    """Autonomous spreadsheet synchronization system"""

    def __init__(self):
        self.cache_file = Path.home() / ".spreadsheet_sync_cache.json"
        self.cache = self.load_cache()
        self.changes_detected = []

    def load_cache(self):
        """Load file hash cache"""
        if self.cache_file.exists():
            try:
                with open(self.cache_file, 'r') as f:
                    return json.load(f)
            except:
                pass
        return {}

    def save_cache(self):
        """Save file hash cache"""
        try:
            with open(self.cache_file, 'w') as f:
                json.dump(self.cache, f, indent=2)
        except Exception as e:
            print(f"Warning: Could not save cache: {e}")

    def get_file_hash(self, filepath):
        """Calculate SHA256 hash of file"""
        try:
            with open(filepath, 'rb') as f:
                return hashlib.sha256(f.read()).hexdigest()
        except:
            return None

    def find_all_spreadsheets(self):
        """Find all .xlsx files in monitored directories"""
        spreadsheets = []

        for directory in SPREADSHEET_DIRS:
            if not directory.exists():
                continue

            # Search directory and subdirectories
            for xlsx_file in directory.rglob("*.xlsx"):
                # Skip temp files
                if xlsx_file.name.startswith("~$"):
                    continue

                spreadsheets.append(xlsx_file)

        return spreadsheets

    def check_for_changes(self):
        """Check all spreadsheets for changes"""
        spreadsheets = self.find_all_spreadsheets()
        self.changes_detected = []

        print(f"\n🔍 Scanning {len(spreadsheets)} spreadsheet(s)...")

        for filepath in spreadsheets:
            current_hash = self.get_file_hash(filepath)

            if current_hash is None:
                continue

            file_key = str(filepath)
            cached_hash = self.cache.get(file_key)

            if cached_hash != current_hash:
                self.changes_detected.append({
                    'path': filepath,
                    'name': filepath.name,
                    'size': filepath.stat().st_size,
                    'modified': datetime.fromtimestamp(filepath.stat().st_mtime),
                    'hash': current_hash,
                    'status': 'modified' if cached_hash else 'new'
                })

                # Update cache
                self.cache[file_key] = current_hash

        if self.changes_detected:
            print(f"✅ Detected {len(self.changes_detected)} change(s)")
            self.save_cache()
        else:
            print("✅ No changes detected")

        return self.changes_detected

    def sync_to_local_backup(self):
        """Copy changed files to backup location"""
        backup_dir = Path.home() / "SPREADSHEET_BRAIN_BACKUP" / datetime.now().strftime("%Y-%m-%d")
        backup_dir.mkdir(parents=True, exist_ok=True)

        for change in self.changes_detected:
            try:
                import shutil
                dest = backup_dir / change['name']
                shutil.copy2(change['path'], dest)
                print(f"📁 Backed up: {change['name']} → {dest}")
            except Exception as e:
                print(f"⚠️  Backup failed for {change['name']}: {e}")

    def generate_report(self):
        """Generate sync report"""
        if not self.changes_detected:
            return None

        report = {
            'timestamp': datetime.now().isoformat(),
            'changes': len(self.changes_detected),
            'files': []
        }

        for change in self.changes_detected:
            report['files'].append({
                'name': change['name'],
                'status': change['status'],
                'size': change['size'],
                'modified': change['modified'].isoformat()
            })

        return report

    def export_to_csv(self):
        """Export spreadsheet list to CSV for easy upload"""
        spreadsheets = self.find_all_spreadsheets()

        csv_file = Path.home() / "SPREADSHEET_BRAIN_INDEX.csv"

        try:
            with open(csv_file, 'w', encoding='utf-8') as f:
                f.write("Filename,Path,Size (bytes),Last Modified,Hash\n")

                for filepath in spreadsheets:
                    name = filepath.name
                    path = str(filepath)
                    size = filepath.stat().st_size
                    modified = datetime.fromtimestamp(filepath.stat().st_mtime).isoformat()
                    file_hash = self.get_file_hash(filepath)

                    f.write(f'"{name}","{path}",{size},"{modified}","{file_hash}"\n')

            print(f"\n📊 Exported spreadsheet index: {csv_file}")
            return csv_file

        except Exception as e:
            print(f"⚠️  Export failed: {e}")
            return None

    def run_sync_cycle(self):
        """Run one sync cycle"""
        print("\n" + "=" * 70)
        print(f"🧠 SPREADSHEET BRAIN SYNC - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 70)

        # Check for changes
        changes = self.check_for_changes()

        if changes:
            print(f"\n📝 Changes detected:")
            for change in changes:
                status_icon = "✨" if change['status'] == 'new' else "📝"
                print(f"   {status_icon} {change['name']} ({change['status']})")

            # Backup to local
            self.sync_to_local_backup()

            # Generate report
            report = self.generate_report()
            if report:
                report_file = Path.home() / "SPREADSHEET_SYNC_REPORT.json"
                with open(report_file, 'w') as f:
                    json.dump(report, f, indent=2)
                print(f"\n📄 Report saved: {report_file}")

        # Export index
        self.export_to_csv()

        print("\n✅ Sync cycle complete")
        print("=" * 70)

    def run_continuous(self):
        """Run continuous sync loop"""
        print("\n🚀 STARTING SPREADSHEET BRAIN SYNC")
        print(f"📁 Monitoring directories:")
        for directory in SPREADSHEET_DIRS:
            print(f"   • {directory}")
        print(f"\n⏱️  Sync interval: {SYNC_INTERVAL} seconds ({SYNC_INTERVAL//60} minutes)")
        print("\nPress Ctrl+C to stop\n")

        try:
            while True:
                self.run_sync_cycle()
                print(f"\n💤 Sleeping for {SYNC_INTERVAL//60} minutes...")
                time.sleep(SYNC_INTERVAL)

        except KeyboardInterrupt:
            print("\n\n🛑 Sync stopped by user")
            self.save_cache()

def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="Spreadsheet Brain Cloud Sync")
    parser.add_argument('--once', action='store_true', help='Run once and exit')
    parser.add_argument('--export', action='store_true', help='Export index only')

    args = parser.parse_args()

    syncer = SpreadsheetBrainSync()

    if args.export:
        # Just export index
        syncer.export_to_csv()
    elif args.once:
        # Run once
        syncer.run_sync_cycle()
    else:
        # Run continuously
        syncer.run_continuous()

if __name__ == "__main__":
    main()
