"""
AUTONOMOUS TASK QUEUE
=====================
Central task distribution for Trinity network.
Computers claim tasks, complete them, return results.
"""

import os
import json
from pathlib import Path
from datetime import datetime
import uuid

class TaskQueue:
    def __init__(self):
        self.computer = os.environ.get('COMPUTERNAME', 'UNKNOWN')
        self.queue_dir = Path(f"C:/Users/{os.environ.get('USERNAME', 'dwrek')}/.trinity/tasks")
        self.queue_dir.mkdir(parents=True, exist_ok=True)

        self.queue_file = self.queue_dir / "task_queue.json"
        self.results_dir = self.queue_dir / "results"
        self.results_dir.mkdir(exist_ok=True)

        # Initialize queue if not exists
        if not self.queue_file.exists():
            self.queue_file.write_text(json.dumps({"tasks": []}, indent=2))

    def add_task(self, title, description, assigned_to=None, priority="normal"):
        """Add a new task to the queue"""
        queue = self._load_queue()

        task = {
            "id": str(uuid.uuid4())[:8],
            "title": title,
            "description": description,
            "status": "pending",
            "priority": priority,
            "assigned_to": assigned_to,
            "created_by": self.computer,
            "created_at": datetime.now().isoformat(),
            "claimed_by": None,
            "claimed_at": None,
            "completed_at": None,
            "result": None
        }

        queue["tasks"].append(task)
        self._save_queue(queue)

        print(f"Task added: [{task['id']}] {title}")
        return task

    def claim_task(self, task_id=None):
        """Claim a task (or next available)"""
        queue = self._load_queue()

        for task in queue["tasks"]:
            # Find matching or next available
            if task_id and task["id"] != task_id:
                continue
            if task["status"] != "pending":
                continue
            if task["assigned_to"] and task["assigned_to"] != self.computer:
                continue

            # Claim it
            task["status"] = "in_progress"
            task["claimed_by"] = self.computer
            task["claimed_at"] = datetime.now().isoformat()

            self._save_queue(queue)
            print(f"Claimed task: [{task['id']}] {task['title']}")
            return task

        print("No available tasks to claim")
        return None

    def complete_task(self, task_id, result):
        """Mark task complete with result"""
        queue = self._load_queue()

        for task in queue["tasks"]:
            if task["id"] == task_id:
                task["status"] = "completed"
                task["completed_at"] = datetime.now().isoformat()
                task["result"] = result

                # Save result file
                result_file = self.results_dir / f"{task_id}_result.json"
                result_file.write_text(json.dumps({
                    "task_id": task_id,
                    "title": task["title"],
                    "result": result,
                    "completed_by": self.computer,
                    "completed_at": task["completed_at"]
                }, indent=2))

                self._save_queue(queue)
                print(f"Completed task: [{task_id}]")
                return task

        print(f"Task not found: {task_id}")
        return None

    def get_pending_tasks(self):
        """Get all pending tasks"""
        queue = self._load_queue()
        return [t for t in queue["tasks"] if t["status"] == "pending"]

    def get_my_tasks(self):
        """Get tasks assigned to or claimed by this computer"""
        queue = self._load_queue()
        return [t for t in queue["tasks"]
                if t["assigned_to"] == self.computer or t["claimed_by"] == self.computer]

    def get_status(self):
        """Get queue status summary"""
        queue = self._load_queue()
        tasks = queue["tasks"]

        return {
            "total": len(tasks),
            "pending": len([t for t in tasks if t["status"] == "pending"]),
            "in_progress": len([t for t in tasks if t["status"] == "in_progress"]),
            "completed": len([t for t in tasks if t["status"] == "completed"])
        }

    def _load_queue(self):
        return json.loads(self.queue_file.read_text())

    def _save_queue(self, queue):
        self.queue_file.write_text(json.dumps(queue, indent=2))


# Quick functions
def add_task(title, description, assigned_to=None):
    q = TaskQueue()
    return q.add_task(title, description, assigned_to)

def claim_task(task_id=None):
    q = TaskQueue()
    return q.claim_task(task_id)

def complete_task(task_id, result):
    q = TaskQueue()
    return q.complete_task(task_id, result)

def get_tasks():
    q = TaskQueue()
    return q.get_pending_tasks()


if __name__ == "__main__":
    # Initialize with tasks for C2 and C3
    q = TaskQueue()

    # Add initial tasks
    q.add_task(
        "Complete setup and send confirmation",
        "Run FINAL_SETUP_DO_THIS_NOW.txt and send ready.txt back",
        assigned_to="desktop-msmcfh2"
    )

    q.add_task(
        "Complete setup and send confirmation",
        "Run FINAL_SETUP_DO_THIS_NOW.txt and send ready.txt back",
        assigned_to="desktop-s72lrro"
    )

    q.add_task(
        "Run capability report",
        "Execute REPORT_YOUR_CAPABILITIES.txt and send results",
        assigned_to="desktop-msmcfh2"
    )

    q.add_task(
        "Run capability report",
        "Execute REPORT_YOUR_CAPABILITIES.txt and send results",
        assigned_to="desktop-s72lrro"
    )

    q.add_task(
        "Full system rake",
        "Run MULTI_COMPUTER_RAKE_SYSTEM.py --full-rake and send index",
        priority="high"
    )

    print("\nQueue Status:", q.get_status())
    print("\nPending Tasks:")
    for task in q.get_pending_tasks():
        print(f"  [{task['id']}] {task['title']} -> {task['assigned_to'] or 'anyone'}")
