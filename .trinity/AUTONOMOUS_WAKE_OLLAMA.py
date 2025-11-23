"""
AUTONOMOUS WAKE SYSTEM WITH OLLAMA
===================================
Watches for incoming files and processes them with local AI.
No internet required once Ollama is installed.
"""

import os
import time
import subprocess
import json
from pathlib import Path
from datetime import datetime

class AutonomousWake:
    def __init__(self):
        self.computer_name = os.environ.get('COMPUTERNAME', 'UNKNOWN')
        self.watch_folder = Path("C:/Users") / os.environ.get('USERNAME', 'dwrek') / "Downloads"
        self.processed_folder = Path("C:/Users") / os.environ.get('USERNAME', 'dwrek') / ".trinity" / "processed"
        self.processed_folder.mkdir(parents=True, exist_ok=True)
        self.known_files = set()
        self.load_known_files()

    def load_known_files(self):
        for f in self.watch_folder.glob('*'):
            if f.is_file():
                self.known_files.add(f.name)

    def check_ollama(self):
        """Check if Ollama is running"""
        try:
            result = subprocess.run(['ollama', 'list'], capture_output=True, timeout=5)
            return result.returncode == 0
        except:
            return False

    def ask_ollama(self, prompt):
        """Send prompt to Ollama"""
        try:
            result = subprocess.run(
                ['ollama', 'run', 'llama3.2', prompt],
                capture_output=True,
                text=True,
                timeout=60
            )
            return result.stdout.strip()
        except Exception as e:
            return f"Ollama error: {e}"

    def get_new_files(self):
        """Check for new files via Tailscale"""
        try:
            subprocess.run(
                ['tailscale', 'file', 'get', '--conflict=rename', str(self.watch_folder)],
                capture_output=True,
                timeout=10
            )
        except:
            pass

        new_files = []
        for f in self.watch_folder.glob('*'):
            if f.is_file() and f.name not in self.known_files:
                new_files.append(f)
                self.known_files.add(f.name)
        return new_files

    def process_file(self, filepath):
        """Process incoming file with Ollama"""
        print(f"\n{'='*50}")
        print(f"NEW FILE: {filepath.name}")
        print(f"{'='*50}")

        # Read file content
        content = ""
        if filepath.suffix in ['.txt', '.md', '.json', '.py']:
            try:
                content = filepath.read_text(encoding='utf-8')[:2000]
            except:
                content = "[Could not read file]"

        # Check if it's a command/question
        if content and any(word in content.lower() for word in ['?', 'please', 'can you', 'what', 'how', 'why']):
            print("\nDetected question - asking Ollama...")

            prompt = f"You received this message on computer {self.computer_name}. Respond helpfully:\n\n{content}"
            response = self.ask_ollama(prompt)

            print(f"\nOllama response:\n{response[:500]}")

            # Save response
            response_file = self.watch_folder / f"RESPONSE_TO_{filepath.stem}.txt"
            response_file.write_text(f"From: {self.computer_name}\nTime: {datetime.now()}\n\n{response}")

            print(f"\nResponse saved to: {response_file}")
            print("Send back with: tailscale file cp \"{response_file}\" dwrekscpu:")

        else:
            print(f"\nFile received and saved.")
            if content:
                print(f"Preview: {content[:200]}...")

    def run(self):
        """Main loop"""
        print(f"""
╔══════════════════════════════════════════════════╗
║  AUTONOMOUS WAKE SYSTEM - {self.computer_name}
╠══════════════════════════════════════════════════╣
║  Watching for files + Ollama AI processing       ║
║  Press Ctrl+C to stop                            ║
╚══════════════════════════════════════════════════╝
        """)

        if self.check_ollama():
            print("✓ Ollama is ready")
        else:
            print("✗ Ollama not found - install with: ollama pull llama3.2")

        print(f"\nWatching: {self.watch_folder}")
        print("Waiting for files...\n")

        try:
            while True:
                new_files = self.get_new_files()
                for f in new_files:
                    self.process_file(f)
                time.sleep(5)
        except KeyboardInterrupt:
            print("\n\nAutonomous wake stopped.")


if __name__ == "__main__":
    wake = AutonomousWake()
    wake.run()
