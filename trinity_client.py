#!/usr/bin/env python3
"""
Trinity Client - Autonomous Instance Registration and Coordination

This client:
1. Registers this computer as a Trinity instance
2. Sends heartbeats every 60 seconds
3. Claims available tasks
4. Reports completion
5. Maintains continuous connection to backend

Usage:
    python trinity_client.py --role C2_ARCHITECT --name Computer-1
"""

import requests
import json
import time
import argparse
import socket
from datetime import datetime

BACKEND_URL = "https://cloud-funnel-production.up.railway.app"
HEARTBEAT_INTERVAL = 60  # seconds
TASK_CHECK_INTERVAL = 30  # seconds

class TrinityClient:
    def __init__(self, role, computer_name, focus="Autonomous coordination"):
        self.role = role
        self.computer_name = computer_name
        self.focus = focus
        self.instance_id = f"{role.lower()}_{computer_name.lower().replace(' ', '_')}_{int(time.time())}"
        self.last_heartbeat = None
        self.current_task = None

    def register(self):
        """Register this instance with Trinity backend"""
        print(f"Registering as {self.role} on {self.computer_name}...")
        print(f"Instance ID: {self.instance_id}")

        try:
            response = requests.post(
                f"{BACKEND_URL}/api/v1/trinity/instances/register",
                json={
                    "instance_id": self.instance_id,
                    "role": self.role,
                    "computer_name": self.computer_name,
                    "focus": self.focus,
                    "metadata": {
                        "hostname": socket.gethostname(),
                        "started_at": datetime.utcnow().isoformat()
                    }
                },
                timeout=10
            )

            if response.status_code in [200, 201]:
                data = response.json()
                print(f"[OK] Registered successfully!")
                print(f"     ID: {data.get('id')}")
                print(f"     Status: {data.get('status')}")
                return True
            else:
                print(f"[ERROR] Registration failed: {response.status_code}")
                print(response.text)
                return False

        except Exception as e:
            print(f"[ERROR] Registration error: {e}")
            return False

    def heartbeat(self):
        """Send heartbeat to maintain active status"""
        try:
            response = requests.post(
                f"{BACKEND_URL}/api/v1/trinity/instances/{self.instance_id}/heartbeat",
                json={
                    "status": "active",
                    "focus": self.focus
                },
                timeout=5
            )

            if response.status_code == 200:
                self.last_heartbeat = datetime.utcnow()
                return True
            else:
                print(f"[WARN] Heartbeat failed: {response.status_code}")
                return False

        except Exception as e:
            print(f"[WARN] Heartbeat error: {e}")
            return False

    def get_available_tasks(self):
        """Get tasks available for this role"""
        try:
            response = requests.get(
                f"{BACKEND_URL}/api/v1/trinity/tasks",
                params={
                    "status": "available",
                    "role_target": self.role
                },
                timeout=5
            )

            if response.status_code == 200:
                return response.json()
            else:
                return []

        except Exception as e:
            print(f"[WARN] Task fetch error: {e}")
            return []

    def claim_task(self, task_id):
        """Claim a task atomically"""
        try:
            response = requests.post(
                f"{BACKEND_URL}/api/v1/trinity/tasks/{task_id}/claim",
                json={
                    "instance_id": self.instance_id
                },
                timeout=5
            )

            if response.status_code == 200:
                task = response.json()
                print(f"[CLAIMED] Task {task_id}: {task.get('task_name')}")
                self.current_task = task
                self.focus = f"Working on: {task.get('task_name')}"
                return True
            elif response.status_code == 409:
                print(f"[INFO] Task {task_id} already claimed by another instance")
                return False
            else:
                print(f"[WARN] Claim failed: {response.status_code}")
                return False

        except Exception as e:
            print(f"[WARN] Claim error: {e}")
            return False

    def complete_task(self, task_id, result=None):
        """Mark task as completed"""
        try:
            response = requests.post(
                f"{BACKEND_URL}/api/v1/trinity/tasks/{task_id}/complete",
                json={
                    "result": result or "Completed successfully"
                },
                timeout=5
            )

            if response.status_code == 200:
                print(f"[COMPLETED] Task {task_id}")
                self.current_task = None
                self.focus = "Seeking next task"
                return True
            else:
                print(f"[WARN] Complete failed: {response.status_code}")
                return False

        except Exception as e:
            print(f"[WARN] Complete error: {e}")
            return False

    def run(self):
        """Main coordination loop"""
        print("\n" + "=" * 60)
        print("TRINITY CLIENT - AUTONOMOUS COORDINATION")
        print("=" * 60)
        print()

        # Initial registration
        if not self.register():
            print("[ERROR] Failed to register. Exiting.")
            return

        print()
        print("Starting autonomous coordination loop...")
        print(f"Heartbeat interval: {HEARTBEAT_INTERVAL}s")
        print(f"Task check interval: {TASK_CHECK_INTERVAL}s")
        print("Press Ctrl+C to stop")
        print()

        heartbeat_counter = 0
        task_check_counter = 0

        try:
            while True:
                # Send heartbeat
                if heartbeat_counter >= HEARTBEAT_INTERVAL:
                    if self.heartbeat():
                        print(f"[{datetime.now().strftime('%H:%M:%S')}] Heartbeat sent | Focus: {self.focus}")
                    heartbeat_counter = 0

                # Check for tasks
                if task_check_counter >= TASK_CHECK_INTERVAL and not self.current_task:
                    tasks = self.get_available_tasks()
                    if tasks:
                        print(f"[{datetime.now().strftime('%H:%M:%S')}] Found {len(tasks)} available task(s)")
                        # Try to claim the highest priority task
                        tasks_sorted = sorted(tasks, key=lambda t: t.get('priority', 0), reverse=True)
                        for task in tasks_sorted:
                            if self.claim_task(task['id']):
                                break
                    task_check_counter = 0

                # Simulate task work if we have one
                if self.current_task:
                    # In a real implementation, this would execute the actual task
                    # For now, just complete it after a short delay
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] Simulating work on task...")
                    time.sleep(5)
                    self.complete_task(self.current_task['id'])

                time.sleep(1)
                heartbeat_counter += 1
                task_check_counter += 1

        except KeyboardInterrupt:
            print("\n\nShutting down Trinity client...")
            print("Sending final status update...")

            # Final heartbeat with inactive status
            try:
                requests.post(
                    f"{BACKEND_URL}/api/v1/trinity/instances/{self.instance_id}/heartbeat",
                    json={"status": "inactive"},
                    timeout=5
                )
                print("[OK] Clean shutdown complete")
            except:
                print("[WARN] Could not send final update")

        print("\nTrinity client stopped.")
        print()

def main():
    parser = argparse.ArgumentParser(description="Trinity Client - Autonomous Instance Coordination")
    parser.add_argument(
        "--role",
        type=str,
        required=True,
        choices=["C1_MECHANIC", "C2_ARCHITECT", "C3_ORACLE"],
        help="Trinity role for this instance"
    )
    parser.add_argument(
        "--name",
        type=str,
        required=True,
        help="Computer name (e.g., Computer-1, Computer-A)"
    )
    parser.add_argument(
        "--focus",
        type=str,
        default="Autonomous coordination",
        help="Initial focus/task description"
    )

    args = parser.parse_args()

    client = TrinityClient(
        role=args.role,
        computer_name=args.name,
        focus=args.focus
    )

    client.run()

if __name__ == "__main__":
    main()
