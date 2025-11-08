#!/usr/bin/env python3
"""
Trinity Status Dashboard - Real-time system monitoring

Shows:
- Active Trinity instances
- Task status (available/claimed/completed)
- System health
- Recent activity

Usage:
    python trinity_status.py           # One-time status
    python trinity_status.py --watch   # Continuous monitoring
"""

import requests
import json
import time
import argparse
from datetime import datetime
from collections import Counter

BACKEND_URL = "https://cloud-funnel-production.up.railway.app"

def get_instances():
    """Get all Trinity instances"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/v1/trinity/instances", timeout=5)
        if response.status_code == 200:
            return response.json()
        return []
    except:
        return []

def get_tasks():
    """Get all Trinity tasks"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/v1/trinity/tasks", timeout=5)
        if response.status_code == 200:
            return response.json()
        return []
    except:
        return []

def get_health():
    """Get backend health"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/v1/health", timeout=5)
        if response.status_code == 200:
            return response.json()
        return None
    except:
        return None

def get_knowledge_stats():
    """Get knowledge API stats"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/v1/knowledge/stats", timeout=5)
        if response.status_code == 200:
            return response.json()
        return None
    except:
        return None

def display_status(clear_screen=False):
    """Display complete Trinity status"""
    if clear_screen:
        print("\033[2J\033[H")  # Clear screen and move cursor to top

    print("=" * 70)
    print("TRINITY SYSTEM STATUS")
    print("=" * 70)
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Backend: {BACKEND_URL}")
    print()

    # Backend health
    health = get_health()
    if health:
        print("[BACKEND]")
        print(f"  Status: {health.get('status', 'unknown').upper()}")
        print(f"  Version: {health.get('version', 'unknown')}")
        uptime = health.get('uptime', {})
        if uptime:
            print(f"  Uptime: {uptime.get('days', 0)}d {uptime.get('hours', 0)}h {uptime.get('minutes', 0)}m")
        print()
    else:
        print("[BACKEND]")
        print("  Status: OFFLINE or UNREACHABLE")
        print()

    # Trinity instances
    instances = get_instances()
    print(f"[INSTANCES] ({len(instances)} active)")

    if instances:
        for inst in instances:
            role = inst.get('role', 'UNKNOWN')
            status = inst.get('status', 'unknown')
            focus = inst.get('focus', 'None')
            computer = inst.get('computer_name', 'Unknown')
            heartbeat = inst.get('last_heartbeat', '')

            status_icon = "[ACTIVE]" if status == 'active' else "[INACTIVE]"
            print(f"  {status_icon} {role} on {computer}")
            print(f"           Focus: {focus}")
            if heartbeat:
                print(f"           Last heartbeat: {heartbeat}")
            print()
    else:
        print("  No active instances")
        print()

    # Tasks
    tasks = get_tasks()
    print(f"[TASKS] ({len(tasks)} total)")

    if tasks:
        # Count by status
        status_counts = Counter(t.get('status', 'unknown') for t in tasks)
        print(f"  Available: {status_counts.get('available', 0)}")
        print(f"  Claimed: {status_counts.get('claimed', 0)}")
        print(f"  Completed: {status_counts.get('completed', 0)}")
        print()

        # Count by role
        role_counts = Counter(t.get('role_target', 'ANY') for t in tasks)
        print("  By Role:")
        for role, count in role_counts.most_common():
            print(f"    {role}: {count}")
        print()

        # Show highest priority available tasks
        available = [t for t in tasks if t.get('status') == 'available']
        if available:
            available_sorted = sorted(available, key=lambda t: t.get('priority', 0), reverse=True)
            print(f"  Top Priority Available ({min(3, len(available_sorted))}):")
            for task in available_sorted[:3]:
                priority = task.get('priority', 0)
                name = task.get('task_name', 'Unknown')[:50]
                role = task.get('role_target', 'ANY')
                print(f"    [{priority}] {name} ({role})")
            print()

        # Show currently claimed tasks
        claimed = [t for t in tasks if t.get('status') == 'claimed']
        if claimed:
            print(f"  Currently In Progress ({len(claimed)}):")
            for task in claimed:
                name = task.get('task_name', 'Unknown')[:50]
                assigned = task.get('assigned_to', 'Unknown')
                print(f"    - {name}")
                print(f"      Assigned to: {assigned}")
            print()
    else:
        print("  No tasks in system")
        print()

    # Knowledge stats
    knowledge = get_knowledge_stats()
    if knowledge:
        print("[KNOWLEDGE API]")
        total = knowledge.get('total', 0)
        categories = knowledge.get('by_category', {})
        print(f"  Total items: {total}")
        if categories:
            print("  By category:")
            for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True)[:5]:
                print(f"    {cat}: {count}")
        print()

    print("=" * 70)
    print()

def watch_mode(interval=10):
    """Continuous monitoring mode"""
    print("Starting watch mode (Ctrl+C to exit)...")
    print(f"Refresh interval: {interval} seconds")
    print()

    try:
        while True:
            display_status(clear_screen=True)
            print(f"Refreshing in {interval}s... (Ctrl+C to exit)")
            time.sleep(interval)
    except KeyboardInterrupt:
        print("\n\nExiting watch mode.")

def main():
    parser = argparse.ArgumentParser(description="Trinity System Status Dashboard")
    parser.add_argument(
        "--watch",
        action="store_true",
        help="Continuous monitoring mode"
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=10,
        help="Refresh interval in seconds (watch mode only)"
    )

    args = parser.parse_args()

    if args.watch:
        watch_mode(args.interval)
    else:
        display_status()

if __name__ == "__main__":
    main()
