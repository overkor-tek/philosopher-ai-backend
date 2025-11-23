"""
COMPUTER DISCOVERY TOOL
=======================
Audits a computer and lets user choose what to share.
Safe for use on other people's computers.

Creates an inventory WITHOUT copying personal files.
"""

import os
from pathlib import Path
from datetime import datetime
import json

class ComputerDiscovery:
    def __init__(self):
        self.computer_name = os.environ.get('COMPUTERNAME', 'UNKNOWN')
        self.username = os.environ.get('USERNAME', 'UNKNOWN')
        self.results = {
            "computer": self.computer_name,
            "user": self.username,
            "scan_time": datetime.now().isoformat(),
            "drives": [],
            "key_folders": {},
            "file_summary": {},
            "selected_shares": []
        }

    def discover_drives(self):
        """Find all available drives"""
        print("\n=== DISCOVERING DRIVES ===")
        drives = []
        for letter in 'CDEFGHIJKLMNOPQRSTUVWXYZ':
            drive = f"{letter}:\\"
            if os.path.exists(drive):
                try:
                    total, used, free = self.get_drive_space(drive)
                    drive_info = {
                        "letter": letter,
                        "path": drive,
                        "total_gb": round(total / (1024**3), 2),
                        "used_gb": round(used / (1024**3), 2),
                        "free_gb": round(free / (1024**3), 2)
                    }
                    drives.append(drive_info)
                    print(f"  [{letter}:] {drive_info['used_gb']}GB used / {drive_info['total_gb']}GB total")
                except:
                    drives.append({"letter": letter, "path": drive, "error": "Could not read"})

        self.results["drives"] = drives
        return drives

    def get_drive_space(self, path):
        """Get drive space info"""
        import ctypes
        free_bytes = ctypes.c_ulonglong(0)
        total_bytes = ctypes.c_ulonglong(0)
        ctypes.windll.kernel32.GetDiskFreeSpaceExW(
            ctypes.c_wchar_p(path), None, ctypes.pointer(total_bytes), ctypes.pointer(free_bytes)
        )
        total = total_bytes.value
        free = free_bytes.value
        used = total - free
        return total, used, free

    def scan_key_folders(self):
        """Scan standard user folders"""
        print("\n=== SCANNING KEY FOLDERS ===")
        user_home = Path.home()

        key_folders = {
            "Desktop": user_home / "Desktop",
            "Documents": user_home / "Documents",
            "Downloads": user_home / "Downloads",
            "Pictures": user_home / "Pictures",
            "Videos": user_home / "Videos",
            "Music": user_home / "Music"
        }

        for name, path in key_folders.items():
            if path.exists():
                file_count = sum(1 for _ in path.rglob('*') if _.is_file())
                folder_count = sum(1 for _ in path.rglob('*') if _.is_dir())

                # Get file type breakdown
                extensions = {}
                for f in path.rglob('*'):
                    if f.is_file():
                        ext = f.suffix.lower() or '.no_ext'
                        extensions[ext] = extensions.get(ext, 0) + 1

                # Top 5 file types
                top_types = sorted(extensions.items(), key=lambda x: x[1], reverse=True)[:5]

                self.results["key_folders"][name] = {
                    "path": str(path),
                    "files": file_count,
                    "folders": folder_count,
                    "top_types": dict(top_types)
                }
                print(f"  [{name}] {file_count} files, {folder_count} folders")
            else:
                self.results["key_folders"][name] = {"exists": False}

    def interactive_selection(self):
        """Let user choose what to share"""
        print("\n" + "="*50)
        print("CHOOSE WHAT TO SHARE")
        print("="*50)
        print("\nAvailable folders to share:")

        options = []
        for i, (name, info) in enumerate(self.results["key_folders"].items(), 1):
            if isinstance(info, dict) and info.get("files", 0) > 0:
                print(f"  {i}. {name} ({info['files']} files)")
                options.append(name)

        print(f"\n  0. Skip - Don't share anything")
        print(f"  A. All - Share everything listed")

        choice = input("\nEnter numbers separated by commas (e.g., 1,3,5) or A for all: ").strip()

        if choice.upper() == 'A':
            self.results["selected_shares"] = options
        elif choice == '0':
            self.results["selected_shares"] = []
        else:
            try:
                indices = [int(x.strip()) for x in choice.split(',')]
                self.results["selected_shares"] = [options[i-1] for i in indices if 0 < i <= len(options)]
            except:
                print("Invalid selection, sharing nothing.")
                self.results["selected_shares"] = []

        print(f"\nWill share: {', '.join(self.results['selected_shares']) or 'Nothing'}")

    def create_file_index(self):
        """Create index of files in selected folders"""
        print("\n=== CREATING FILE INDEX ===")

        file_index = []
        for folder_name in self.results["selected_shares"]:
            folder_info = self.results["key_folders"].get(folder_name, {})
            folder_path = folder_info.get("path")

            if folder_path and os.path.exists(folder_path):
                for f in Path(folder_path).rglob('*'):
                    if f.is_file():
                        try:
                            file_index.append({
                                "name": f.name,
                                "folder": folder_name,
                                "path": str(f),
                                "size": f.stat().st_size,
                                "modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat()
                            })
                        except:
                            pass

        self.results["file_index"] = file_index
        print(f"  Indexed {len(file_index)} files")

    def save_inventory(self):
        """Save the inventory to a file"""
        output_file = Path.home() / "Desktop" / f"COMPUTER_INVENTORY_{self.computer_name}.json"

        with open(output_file, 'w') as f:
            json.dump(self.results, f, indent=2)

        print(f"\n=== INVENTORY SAVED ===")
        print(f"  File: {output_file}")
        print(f"\nSend this file to Computer 1:")
        print(f"  tailscale file cp \"{output_file}\" dwrekscpu:")

        return output_file

    def run(self):
        """Run full discovery"""
        print("="*50)
        print(f"COMPUTER DISCOVERY - {self.computer_name}")
        print("="*50)

        self.discover_drives()
        self.scan_key_folders()
        self.interactive_selection()

        if self.results["selected_shares"]:
            self.create_file_index()

        output_file = self.save_inventory()

        print("\n" + "="*50)
        print("DISCOVERY COMPLETE")
        print("="*50)

        return output_file


if __name__ == "__main__":
    discovery = ComputerDiscovery()
    discovery.run()
