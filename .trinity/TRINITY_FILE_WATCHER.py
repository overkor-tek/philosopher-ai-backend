"""
TRINITY FILE WATCHER - AUTONOMOUS WAKE SYSTEM
==============================================
Monitors for incoming files and triggers Claude instances.

When a file arrives in the watch folder:
1. Detects new file
2. Shows notification
3. Opens the file or triggers action
4. Can auto-launch Claude Code

Usage:
  python TRINITY_FILE_WATCHER.py

Deploy this on all Trinity computers.
"""

import os
import time
import subprocess
from pathlib import Path
from datetime import datetime
import json

class TrinityFileWatcher:
    def __init__(self):
        self.computer_id = os.environ.get('COMPUTERNAME', 'UNKNOWN')

        # Watch these folders for incoming files
        self.watch_folders = [
            Path("C:/Users/dwrek/.trinity/inbox"),
            Path("C:/Users/dwrek/.trinity/sync"),
            Path("C:/Users/dwrek/Desktop"),  # Tailscale drops files here
        ]

        # Create inbox if not exists
        for folder in self.watch_folders:
            folder.mkdir(parents=True, exist_ok=True)

        # Track known files
        self.known_files = set()
        self.log_file = Path("C:/Users/dwrek/.trinity/watcher_log.json")
        self.load_known_files()

    def load_known_files(self):
        """Load previously seen files"""
        for folder in self.watch_folders:
            if folder.exists():
                for f in folder.iterdir():
                    if f.is_file():
                        self.known_files.add(str(f))

    def check_for_new_files(self):
        """Scan watch folders for new files"""
        new_files = []

        for folder in self.watch_folders:
            if not folder.exists():
                continue

            for f in folder.iterdir():
                if f.is_file() and str(f) not in self.known_files:
                    new_files.append(f)
                    self.known_files.add(str(f))

        return new_files

    def notify(self, message):
        """Show Windows notification"""
        try:
            # PowerShell toast notification
            ps_script = f'''
            [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
            [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
            $template = @"
            <toast>
                <visual>
                    <binding template="ToastText02">
                        <text id="1">Trinity File Watcher</text>
                        <text id="2">{message}</text>
                    </binding>
                </visual>
            </toast>
"@
            $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
            $xml.LoadXml($template)
            $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
            [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Trinity").Show($toast)
            '''
            subprocess.run(["powershell", "-Command", ps_script], capture_output=True)
        except:
            print(f"[NOTIFY] {message}")

    def process_file(self, filepath):
        """Handle incoming file"""
        filename = filepath.name
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        print(f"\n{'='*50}")
        print(f"NEW FILE DETECTED!")
        print(f"{'='*50}")
        print(f"File: {filename}")
        print(f"Path: {filepath}")
        print(f"Time: {timestamp}")
        print(f"Size: {filepath.stat().st_size} bytes")

        # Log the event
        log_entry = {
            "timestamp": timestamp,
            "computer": self.computer_id,
            "file": str(filepath),
            "action": "detected"
        }

        # Determine action based on file type
        if filename.endswith('.txt') or filename.endswith('.md'):
            # Read and display text files
            print(f"\n--- File Contents ---")
            try:
                content = filepath.read_text(encoding='utf-8')
                print(content[:500])  # First 500 chars
                if len(content) > 500:
                    print(f"... [{len(content) - 500} more characters]")
            except:
                print("[Could not read file]")

            # Check if it's a command file
            if "COMMAND:" in str(filepath).upper() or filename.startswith("CMD_"):
                print("\n[COMMAND FILE DETECTED - Processing...]")
                self.execute_command_file(filepath)

        elif filename.endswith('.py'):
            print("\n[Python script received - Ready to execute]")
            log_entry["action"] = "python_script_received"

        elif filename.endswith('.json'):
            print("\n[JSON data received]")
            try:
                data = json.loads(filepath.read_text())
                print(json.dumps(data, indent=2)[:300])
            except:
                pass

        # Notify user
        self.notify(f"New file: {filename}")

        # Save log
        self.save_log(log_entry)

        return log_entry

    def execute_command_file(self, filepath):
        """Execute commands from a command file"""
        try:
            content = filepath.read_text()
            lines = content.strip().split('\n')

            for line in lines:
                if line.startswith('RUN:'):
                    cmd = line[4:].strip()
                    print(f"Executing: {cmd}")
                    subprocess.run(cmd, shell=True)
                elif line.startswith('OPEN:'):
                    path = line[5:].strip()
                    print(f"Opening: {path}")
                    os.startfile(path)
        except Exception as e:
            print(f"Command execution error: {e}")

    def save_log(self, entry):
        """Append to log file"""
        logs = []
        if self.log_file.exists():
            try:
                logs = json.loads(self.log_file.read_text())
            except:
                logs = []

        logs.append(entry)

        # Keep last 100 entries
        logs = logs[-100:]

        self.log_file.write_text(json.dumps(logs, indent=2))

    def run(self, interval=3):
        """Main watch loop"""
        print(f"""
╔══════════════════════════════════════════════════╗
║   TRINITY FILE WATCHER - {self.computer_id}
╠══════════════════════════════════════════════════╣
║   Monitoring for incoming files...               ║
║   Press Ctrl+C to stop                           ║
╚══════════════════════════════════════════════════╝
        """)

        print(f"Watching folders:")
        for folder in self.watch_folders:
            print(f"  - {folder}")
        print(f"\nKnown files: {len(self.known_files)}")
        print(f"\nWaiting for new files...\n")

        try:
            while True:
                new_files = self.check_for_new_files()

                for filepath in new_files:
                    self.process_file(filepath)

                time.sleep(interval)

        except KeyboardInterrupt:
            print("\n\nWatcher stopped.")


if __name__ == "__main__":
    watcher = TrinityFileWatcher()
    watcher.run()
