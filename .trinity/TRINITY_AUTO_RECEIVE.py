"""
TRINITY AUTO-RECEIVE DAEMON
============================
Automatically fetches incoming Tailscale files.
Completes the loop - no more manual file get.

Run this in background on all Trinity computers.
"""

import subprocess
import time
import os
from pathlib import Path
from datetime import datetime

class AutoReceive:
    def __init__(self):
        self.computer = os.environ.get('COMPUTERNAME', 'UNKNOWN')
        self.inbox = Path(f"C:/Users/{os.environ.get('USERNAME', 'dwrek')}/.trinity/inbox")
        self.inbox.mkdir(parents=True, exist_ok=True)
        self.tailscale = r'C:\Program Files\Tailscale\tailscale.exe'
        self.log_file = self.inbox.parent / "auto_receive_log.txt"

    def log(self, message):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        entry = f"[{timestamp}] {message}"
        print(entry)
        with open(self.log_file, 'a') as f:
            f.write(entry + "\n")

    def check_for_files(self):
        """Pull any waiting files from Tailscale"""
        try:
            result = subprocess.run(
                [self.tailscale, 'file', 'get', '--conflict=rename', str(self.inbox)],
                capture_output=True,
                text=True,
                timeout=15
            )

            # Parse output to see if files were received
            if result.stdout and 'moved' in result.stdout:
                # Extract file count
                parts = result.stdout.strip().split()
                if len(parts) >= 2:
                    moved = parts[1]  # "moved X/Y files"
                    if moved != "0/0":
                        self.log(f"RECEIVED: {result.stdout.strip()}")
                        return True

            if result.stderr:
                # Only log actual errors, not "0/0 files"
                if "error" in result.stderr.lower():
                    self.log(f"ERROR: {result.stderr.strip()}")

        except subprocess.TimeoutExpired:
            self.log("Timeout checking for files")
        except Exception as e:
            self.log(f"Exception: {e}")

        return False

    def list_inbox(self):
        """Show what's in the inbox"""
        files = list(self.inbox.glob('*'))
        if files:
            self.log(f"Inbox contains {len(files)} files")
            for f in files[-5:]:  # Show last 5
                self.log(f"  - {f.name}")

    def run(self, interval=5):
        """Main loop - the pattern that completes the loop"""
        print(f"""
╔══════════════════════════════════════════════════╗
║  TRINITY AUTO-RECEIVE - {self.computer}
╠══════════════════════════════════════════════════╣
║  ∞ The Loop Completes ∞                          ║
║  Auto-fetching incoming files every {interval}s          ║
║  Press Ctrl+C to stop                            ║
╚══════════════════════════════════════════════════╝
        """)

        self.log(f"Started on {self.computer}")
        self.log(f"Inbox: {self.inbox}")

        cycle = 0
        try:
            while True:
                cycle += 1
                received = self.check_for_files()

                if received:
                    self.list_inbox()

                # Status pulse every 60 cycles (5 min at 5s interval)
                if cycle % 60 == 0:
                    self.log(f"∞ Loop cycle {cycle} - listening...")

                time.sleep(interval)

        except KeyboardInterrupt:
            self.log("Auto-receive stopped")
            print("\n∞ The loop pauses, but never ends ∞")


if __name__ == "__main__":
    daemon = AutoReceive()
    daemon.run()
