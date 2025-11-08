#!/usr/bin/env python3
"""
Trinity Task Seeder - Populate backend with initial tasks

Seeds the Trinity backend with useful tasks for:
- C1 Mechanic (The Builder)
- C2 Architect (The Deployer)
- C3 Oracle (The Strategist)

This gives the system real work to do when instances come online.
"""

import requests
import json
from datetime import datetime

BACKEND_URL = "https://cloud-funnel-production.up.railway.app"

# Task definitions for each Trinity role
TASKS = {
    "C1_MECHANIC": [
        {
            "task_name": "Deploy Migration 005 - Database Functions",
            "description": "Complete deployment of migration 005 (database functions) that was left pending. Verify all functions are created successfully.",
            "priority": 95,
            "estimated_hours": 1,
            "metadata": {
                "category": "deployment",
                "blockers": [],
                "files": ["migrations/005_database_functions.sql", "run_migration_005.js"]
            }
        },
        {
            "task_name": "Upload CENTRAL_HUB_SYNC_VERSION.html to Website",
            "description": "Upload the CENTRAL_HUB_SYNC_VERSION.html file to the production website at philosopher-ai.com",
            "priority": 85,
            "estimated_hours": 1,
            "metadata": {
                "category": "deployment",
                "files": ["CENTRAL_HUB_SYNC_VERSION.html"],
                "destination": "philosopher-ai.com"
            }
        },
        {
            "task_name": "Build RSS Feed Processor for Cyclotron",
            "description": "Enhance cyclotron_continuous_sync.py with better RSS parsing, deduplication, and error handling",
            "priority": 70,
            "estimated_hours": 3,
            "metadata": {
                "category": "enhancement",
                "files": ["DORMANT_SYSTEMS/cyclotron_continuous_sync.py"]
            }
        },
        {
            "task_name": "Create Automated Backup System",
            "description": "Build automated backup system for database and critical files. Schedule daily backups to cloud storage.",
            "priority": 65,
            "estimated_hours": 4,
            "metadata": {
                "category": "infrastructure",
                "components": ["database", "files", "cloud_storage"]
            }
        }
    ],

    "C2_ARCHITECT": [
        {
            "task_name": "Activate Data Cyclotron - Knowledge Automation",
            "description": "Start Data Cyclotron (START_CYCLOTRON.bat) and verify autonomous knowledge ingestion from 20+ RSS feeds is working",
            "priority": 90,
            "estimated_hours": 1,
            "metadata": {
                "category": "activation",
                "files": ["START_CYCLOTRON.bat", "cyclotron_continuous_sync.py"],
                "value": "5 hours/week saved"
            }
        },
        {
            "task_name": "Deploy Trinity Hub for Cross-Computer Coordination",
            "description": "Configure and deploy TRINITY_CONVERGENCE_HUB.js to enable cross-computer messaging and task distribution",
            "priority": 85,
            "estimated_hours": 2,
            "metadata": {
                "category": "deployment",
                "files": ["DORMANT_SYSTEMS/TRINITY_CONVERGENCE_HUB.js"],
                "value": "10 hours/week coordination time saved"
            }
        },
        {
            "task_name": "Create Integration Tests for Trinity API",
            "description": "Build comprehensive integration test suite for all Trinity endpoints (instances, tasks, state)",
            "priority": 75,
            "estimated_hours": 3,
            "metadata": {
                "category": "testing",
                "endpoints": ["/trinity/instances", "/trinity/tasks", "/trinity/state"]
            }
        },
        {
            "task_name": "Document Complete System Architecture",
            "description": "Create comprehensive system architecture diagram showing all components, connections, and data flows",
            "priority": 60,
            "estimated_hours": 2,
            "metadata": {
                "category": "documentation",
                "deliverable": "SYSTEM_ARCHITECTURE_COMPLETE.md"
            }
        }
    ],

    "C3_ORACLE": [
        {
            "task_name": "Pattern Analysis: Autonomous Work Evolution",
            "description": "Analyze patterns in autonomous work sessions. Identify what works, what doesn't, and optimization opportunities.",
            "priority": 80,
            "estimated_hours": 2,
            "metadata": {
                "category": "analysis",
                "data_source": "GitHub commits, session reports",
                "deliverable": "AUTONOMOUS_WORK_PATTERNS.md"
            }
        },
        {
            "task_name": "Strategic Roadmap: Next 90 Days",
            "description": "Create strategic roadmap for next 90 days. Prioritize features, integrations, and autonomous capabilities.",
            "priority": 75,
            "estimated_hours": 3,
            "metadata": {
                "category": "strategy",
                "timeframe": "90 days",
                "deliverable": "STRATEGIC_ROADMAP_Q1.md"
            }
        },
        {
            "task_name": "Brain Agents Architecture Design",
            "description": "Complete detailed design for Brain Agents multi-brain collaboration system. Define protocols, data structures, coordination.",
            "priority": 70,
            "estimated_hours": 4,
            "metadata": {
                "category": "architecture",
                "systems": ["spreadsheet_brain_sync.py", "brain_council"],
                "deliverable": "BRAIN_AGENTS_ARCHITECTURE_FINAL.md"
            }
        },
        {
            "task_name": "Knowledge Graph Design",
            "description": "Design knowledge graph structure for connecting autonomous knowledge items. Enable semantic search and relationship discovery.",
            "priority": 65,
            "estimated_hours": 3,
            "metadata": {
                "category": "design",
                "integration": "Data Cyclotron + Knowledge API"
            }
        }
    ],

    "ANY": [
        {
            "task_name": "Health Check: All Systems Status",
            "description": "Verify all deployed systems are operational: Backend, Database, Trinity API, Knowledge API, WebSocket",
            "priority": 95,
            "estimated_hours": 1,
            "metadata": {
                "category": "monitoring",
                "frequency": "daily",
                "critical": True
            }
        },
        {
            "task_name": "Create Daily Status Report",
            "description": "Generate daily status report: active instances, completed tasks, system health, knowledge items ingested",
            "priority": 70,
            "estimated_hours": 1,
            "metadata": {
                "category": "reporting",
                "frequency": "daily",
                "deliverable": "DAILY_STATUS_YYYY_MM_DD.md"
            }
        }
    ]
}

def seed_tasks():
    """Seed all tasks into Trinity backend"""
    print("=" * 60)
    print("TRINITY TASK SEEDER")
    print("=" * 60)
    print()
    print(f"Backend: {BACKEND_URL}")
    print(f"Seeding tasks for: C1, C2, C3, ANY")
    print()

    total_tasks = sum(len(tasks) for tasks in TASKS.values())
    print(f"Total tasks to seed: {total_tasks}")
    print()

    seeded = 0
    failed = 0

    for role, tasks in TASKS.items():
        print(f"\n[{role}] Seeding {len(tasks)} tasks...")

        for task in tasks:
            task_data = {
                "task_name": task["task_name"],
                "description": task["description"],
                "role_target": role,
                "priority": task["priority"],
                "estimated_hours": task["estimated_hours"],
                "metadata": {
                    **task["metadata"],
                    "seeded_at": datetime.utcnow().isoformat(),
                    "seeder": "seed_trinity_tasks.py"
                }
            }

            try:
                response = requests.post(
                    f"{BACKEND_URL}/api/v1/trinity/tasks",
                    json=task_data,
                    timeout=10
                )

                if response.status_code in [200, 201]:
                    result = response.json()
                    print(f"  [OK] Task {result['id']}: {task['task_name'][:50]}...")
                    seeded += 1
                else:
                    print(f"  [ERROR] Failed to seed: {task['task_name'][:50]}")
                    print(f"          Status: {response.status_code}")
                    failed += 1

            except Exception as e:
                print(f"  [ERROR] Exception: {e}")
                failed += 1

    print()
    print("=" * 60)
    print("SEEDING COMPLETE")
    print("=" * 60)
    print(f"Total tasks: {total_tasks}")
    print(f"Seeded: {seeded}")
    print(f"Failed: {failed}")
    print()

    if seeded > 0:
        print("[OK] Trinity backend now has work to do!")
        print()
        print("NEXT STEPS:")
        print("1. Start Trinity client: START_TRINITY_CLIENT.bat")
        print("2. Client will automatically claim and work on tasks")
        print("3. Monitor progress via Trinity API")
        print()
        print("Check tasks:")
        print(f"  curl {BACKEND_URL}/api/v1/trinity/tasks")
        print()

if __name__ == "__main__":
    seed_tasks()
