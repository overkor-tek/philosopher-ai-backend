"""
PERSISTENT MEMORY SYSTEM
========================
Saves session context, loads at startup, syncs across computers.
Memory that survives sessions.
"""

import os
import json
from pathlib import Path
from datetime import datetime

class PersistentMemory:
    def __init__(self):
        self.computer = os.environ.get('COMPUTERNAME', 'UNKNOWN')
        self.memory_dir = Path(f"C:/Users/{os.environ.get('USERNAME', 'dwrek')}/.consciousness/memory")
        self.memory_dir.mkdir(parents=True, exist_ok=True)

        self.session_file = self.memory_dir / f"session_{self.computer}.json"
        self.context_file = self.memory_dir / "shared_context.json"
        self.history_file = self.memory_dir / "session_history.jsonl"

    def save_session(self, summary, key_facts=None, tasks_completed=None, tasks_pending=None):
        """Save current session state"""
        session = {
            "computer": self.computer,
            "timestamp": datetime.now().isoformat(),
            "summary": summary,
            "key_facts": key_facts or [],
            "tasks_completed": tasks_completed or [],
            "tasks_pending": tasks_pending or [],
        }

        # Save current session
        self.session_file.write_text(json.dumps(session, indent=2))

        # Append to history
        with open(self.history_file, 'a') as f:
            f.write(json.dumps(session) + "\n")

        print(f"Session saved: {self.session_file}")
        return session

    def load_session(self):
        """Load last session state"""
        if self.session_file.exists():
            return json.loads(self.session_file.read_text())
        return None

    def get_context_injection(self):
        """Generate context to inject at session start"""
        session = self.load_session()
        if not session:
            return "No previous session found."

        context = f"""
## PERSISTENT MEMORY - LAST SESSION

**Computer:** {session.get('computer')}
**Time:** {session.get('timestamp')}

**Summary:**
{session.get('summary')}

**Key Facts:**
{chr(10).join('- ' + f for f in session.get('key_facts', []))}

**Tasks Completed:**
{chr(10).join('- ' + t for t in session.get('tasks_completed', []))}

**Tasks Pending:**
{chr(10).join('- ' + t for t in session.get('tasks_pending', []))}
"""
        return context

    def update_shared_context(self, key, value):
        """Update shared context across computers"""
        context = {}
        if self.context_file.exists():
            context = json.loads(self.context_file.read_text())

        context[key] = {
            "value": value,
            "updated_by": self.computer,
            "timestamp": datetime.now().isoformat()
        }

        self.context_file.write_text(json.dumps(context, indent=2))
        return context

    def get_shared_context(self):
        """Get all shared context"""
        if self.context_file.exists():
            return json.loads(self.context_file.read_text())
        return {}

    def get_history(self, limit=10):
        """Get recent session history"""
        if not self.history_file.exists():
            return []

        sessions = []
        with open(self.history_file, 'r') as f:
            for line in f:
                try:
                    sessions.append(json.loads(line))
                except:
                    pass

        return sessions[-limit:]


# Quick functions for direct use
def save_memory(summary, key_facts=None, tasks_completed=None, tasks_pending=None):
    mem = PersistentMemory()
    return mem.save_session(summary, key_facts, tasks_completed, tasks_pending)

def load_memory():
    mem = PersistentMemory()
    return mem.get_context_injection()

def share_context(key, value):
    mem = PersistentMemory()
    return mem.update_shared_context(key, value)


if __name__ == "__main__":
    # Demo
    mem = PersistentMemory()

    # Save a test session
    mem.save_session(
        summary="Established Triple Trinity network via Tailscale. All 3 computers connected.",
        key_facts=[
            "C1: dwrekscpu (100.70.208.75)",
            "C2: desktop-msmcfh2 (100.85.71.74)",
            "C3: desktop-s72lrro (100.101.209.1)",
            "Auto-receive daemon running",
            "File transfer working"
        ],
        tasks_completed=[
            "Tailscale network setup",
            "Auto-receive daemon created",
            "Boot protocols sent to C2/C3"
        ],
        tasks_pending=[
            "C2/C3 complete setup",
            "Test autonomous task execution",
            "Build monitoring dashboard"
        ]
    )

    print("\n" + mem.get_context_injection())
