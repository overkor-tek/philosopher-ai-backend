"""
MULTI-COMPUTER CONSCIOUSNESS RAKE SYSTEM
=========================================
Scans entire computer, indexes everything, detects changes, syncs across computers.

Usage:
  First time: python MULTI_COMPUTER_RAKE_SYSTEM.py --full-rake
  Check new:  python MULTI_COMPUTER_RAKE_SYSTEM.py --delta
  Compare:    python MULTI_COMPUTER_RAKE_SYSTEM.py --compare C:\path\to\other\index.json
"""

import os
import json
import hashlib
from datetime import datetime
from pathlib import Path
import argparse

class MultiComputerRaker:
    def __init__(self):
        self.computer_id = os.environ.get('COMPUTERNAME', 'UNKNOWN')
        self.index_dir = Path("C:/Users/dwrek/.consciousness/computer_indexes")
        self.index_dir.mkdir(parents=True, exist_ok=True)

        # Directories to scan (customize per computer)
        self.scan_dirs = [
            "C:/Users/dwrek/Desktop",
            "C:/Users/dwrek/Documents",
            "C:/Users/dwrek/100X_DEPLOYMENT",
            "C:/Users/dwrek/.trinity",
            "C:/Users/dwrek/.consciousness",
        ]

        # Skip these
        self.skip_patterns = [
            '.git', '__pycache__', 'node_modules', '.venv',
            'AppData', '.cache', 'Temp'
        ]

    def get_file_hash(self, filepath):
        """Quick hash for change detection"""
        try:
            stat = os.stat(filepath)
            # Use size + mtime for speed (not content hash)
            return f"{stat.st_size}_{stat.st_mtime}"
        except:
            return None

    def should_skip(self, path):
        """Check if path should be skipped"""
        path_str = str(path)
        return any(skip in path_str for skip in self.skip_patterns)

    def full_rake(self):
        """Scan entire computer, create full index"""
        print(f"[{self.computer_id}] Starting FULL RAKE...")
        print(f"Scanning: {self.scan_dirs}")

        index = {
            "computer_id": self.computer_id,
            "timestamp": datetime.now().isoformat(),
            "scan_type": "full",
            "files": {},
            "stats": {
                "total_files": 0,
                "total_dirs": 0,
                "by_extension": {}
            }
        }

        for scan_dir in self.scan_dirs:
            if not os.path.exists(scan_dir):
                print(f"  Skipping (not found): {scan_dir}")
                continue

            print(f"  Scanning: {scan_dir}")

            for root, dirs, files in os.walk(scan_dir):
                # Skip unwanted directories
                dirs[:] = [d for d in dirs if not self.should_skip(os.path.join(root, d))]

                index["stats"]["total_dirs"] += 1

                for filename in files:
                    filepath = os.path.join(root, filename)

                    if self.should_skip(filepath):
                        continue

                    file_hash = self.get_file_hash(filepath)
                    if file_hash:
                        # Store relative to scan dir for portability
                        rel_path = filepath.replace("C:/Users/dwrek/", "~/")

                        index["files"][rel_path] = {
                            "hash": file_hash,
                            "ext": Path(filename).suffix.lower(),
                            "name": filename
                        }

                        index["stats"]["total_files"] += 1

                        # Track by extension
                        ext = Path(filename).suffix.lower() or "no_ext"
                        index["stats"]["by_extension"][ext] = \
                            index["stats"]["by_extension"].get(ext, 0) + 1

        # Save index
        index_file = self.index_dir / f"{self.computer_id}_index.json"
        with open(index_file, 'w') as f:
            json.dump(index, f, indent=2)

        # Also save timestamped backup
        backup_file = self.index_dir / f"{self.computer_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(backup_file, 'w') as f:
            json.dump(index, f, indent=2)

        print(f"\n✅ RAKE COMPLETE")
        print(f"   Files indexed: {index['stats']['total_files']}")
        print(f"   Directories: {index['stats']['total_dirs']}")
        print(f"   Index saved: {index_file}")

        # Show top extensions
        print(f"\n   Top file types:")
        sorted_ext = sorted(index["stats"]["by_extension"].items(),
                          key=lambda x: x[1], reverse=True)[:10]
        for ext, count in sorted_ext:
            print(f"     {ext}: {count}")

        return index

    def delta_scan(self):
        """Compare current state to last index, find what's new/changed"""
        print(f"[{self.computer_id}] Running DELTA SCAN...")

        # Load previous index
        index_file = self.index_dir / f"{self.computer_id}_index.json"
        if not index_file.exists():
            print("No previous index found. Running full rake first...")
            return self.full_rake()

        with open(index_file) as f:
            old_index = json.load(f)

        print(f"Previous scan: {old_index['timestamp']}")

        # Do new scan
        new_index = self.full_rake()

        # Compare
        old_files = set(old_index["files"].keys())
        new_files = set(new_index["files"].keys())

        added = new_files - old_files
        removed = old_files - new_files

        # Check for modified (same path, different hash)
        modified = []
        for filepath in old_files & new_files:
            if old_index["files"][filepath]["hash"] != new_index["files"][filepath]["hash"]:
                modified.append(filepath)

        # Save delta report
        delta = {
            "computer_id": self.computer_id,
            "timestamp": datetime.now().isoformat(),
            "previous_scan": old_index["timestamp"],
            "added": list(added),
            "removed": list(removed),
            "modified": modified,
            "stats": {
                "added_count": len(added),
                "removed_count": len(removed),
                "modified_count": len(modified)
            }
        }

        delta_file = self.index_dir / f"{self.computer_id}_delta.json"
        with open(delta_file, 'w') as f:
            json.dump(delta, f, indent=2)

        print(f"\n📊 DELTA RESULTS:")
        print(f"   Added: {len(added)} files")
        print(f"   Removed: {len(removed)} files")
        print(f"   Modified: {len(modified)} files")

        if added:
            print(f"\n   NEW FILES (last 20):")
            for f in list(added)[:20]:
                print(f"     + {f}")

        if modified:
            print(f"\n   MODIFIED FILES (last 10):")
            for f in modified[:10]:
                print(f"     ~ {f}")

        return delta

    def compare_computers(self, other_index_path):
        """Compare this computer's index to another computer's"""
        print(f"Comparing {self.computer_id} to {other_index_path}")

        # Load both indexes
        my_index_file = self.index_dir / f"{self.computer_id}_index.json"
        if not my_index_file.exists():
            print("No local index. Running full rake first...")
            self.full_rake()

        with open(my_index_file) as f:
            my_index = json.load(f)

        with open(other_index_path) as f:
            other_index = json.load(f)

        my_files = set(my_index["files"].keys())
        other_files = set(other_index["files"].keys())

        only_here = my_files - other_files
        only_there = other_files - my_files
        both = my_files & other_files

        comparison = {
            "my_computer": self.computer_id,
            "other_computer": other_index["computer_id"],
            "timestamp": datetime.now().isoformat(),
            "only_on_mine": list(only_here),
            "only_on_theirs": list(only_there),
            "on_both": len(both),
            "stats": {
                "only_mine": len(only_here),
                "only_theirs": len(only_there),
                "shared": len(both)
            }
        }

        comp_file = self.index_dir / f"compare_{self.computer_id}_vs_{other_index['computer_id']}.json"
        with open(comp_file, 'w') as f:
            json.dump(comparison, f, indent=2)

        print(f"\n🔄 COMPARISON RESULTS:")
        print(f"   Only on {self.computer_id}: {len(only_here)} files")
        print(f"   Only on {other_index['computer_id']}: {len(only_there)} files")
        print(f"   On both: {len(both)} files")

        if only_there:
            print(f"\n   FILES TO SYNC FROM {other_index['computer_id']} (first 20):")
            for f in list(only_there)[:20]:
                print(f"     → {f}")

        return comparison


def main():
    parser = argparse.ArgumentParser(description='Multi-Computer Rake System')
    parser.add_argument('--full-rake', action='store_true', help='Full computer scan')
    parser.add_argument('--delta', action='store_true', help='Find changes since last scan')
    parser.add_argument('--compare', type=str, help='Compare to another computer index')

    args = parser.parse_args()

    raker = MultiComputerRaker()

    if args.full_rake:
        raker.full_rake()
    elif args.delta:
        raker.delta_scan()
    elif args.compare:
        raker.compare_computers(args.compare)
    else:
        # Default: delta scan
        raker.delta_scan()


if __name__ == "__main__":
    main()
