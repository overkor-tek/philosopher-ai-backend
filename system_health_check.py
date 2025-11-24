#!/usr/bin/env python3
"""
OVERKORE System Health Check
Comprehensive monitoring tool for all OVERKORE components

Created: 2025-11-24
Purpose: Monitor health of entire system across all computers and components
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

class SystemHealthCheck:
    """Comprehensive health check for OVERKORE system"""

    def __init__(self):
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "platform": sys.platform,
            "hostname": os.getenv("COMPUTERNAME") or os.getenv("HOSTNAME") or "unknown",
            "checks": [],
            "summary": {
                "total": 0,
                "passed": 0,
                "failed": 0,
                "warnings": 0
            }
        }
        self.repo_root = Path(__file__).parent

    def check(self, name: str, func) -> Tuple[str, str, any]:
        """Run a health check"""
        self.results["summary"]["total"] += 1

        try:
            result = func()
            status = result.get("status", "pass")
            message = result.get("message", "OK")
            details = result.get("details", {})

            if status == "pass":
                self.results["summary"]["passed"] += 1
                icon = "✅"
            elif status == "warn":
                self.results["summary"]["warnings"] += 1
                icon = "⚠️"
            else:
                self.results["summary"]["failed"] += 1
                icon = "❌"

            self.results["checks"].append({
                "name": name,
                "status": status,
                "message": message,
                "details": details,
                "timestamp": datetime.now().isoformat()
            })

            print(f"{icon} {name}: {message}")
            return (status, message, details)

        except Exception as e:
            self.results["summary"]["failed"] += 1
            self.results["checks"].append({
                "name": name,
                "status": "fail",
                "message": str(e),
                "timestamp": datetime.now().isoformat()
            })
            print(f"❌ {name}: ERROR - {e}")
            return ("fail", str(e), {})

    # ==================== CORE SYSTEM CHECKS ====================

    def check_python_version(self) -> Dict:
        """Check Python version"""
        version = sys.version_info
        if version >= (3, 8):
            return {
                "status": "pass",
                "message": f"Python {version.major}.{version.minor}.{version.micro}",
                "details": {"version": f"{version.major}.{version.minor}.{version.micro}"}
            }
        else:
            return {
                "status": "fail",
                "message": f"Python {version.major}.{version.minor} (3.8+ required)",
                "details": {"version": f"{version.major}.{version.minor}"}
            }

    def check_git_status(self) -> Dict:
        """Check git repository status"""
        try:
            # Check if git repo
            result = subprocess.run(
                ["git", "rev-parse", "--git-dir"],
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                timeout=5
            )

            if result.returncode != 0:
                return {
                    "status": "fail",
                    "message": "Not a git repository",
                    "details": {}
                }

            # Get branch name
            branch = subprocess.run(
                ["git", "rev-parse", "--abbrev-ref", "HEAD"],
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                timeout=5
            ).stdout.strip()

            # Get commit count
            commit = subprocess.run(
                ["git", "rev-parse", "--short", "HEAD"],
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                timeout=5
            ).stdout.strip()

            # Check for uncommitted changes
            status = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                timeout=5
            ).stdout.strip()

            uncommitted = len(status.split("\n")) if status else 0

            return {
                "status": "pass",
                "message": f"Branch: {branch}, Commit: {commit}, Uncommitted: {uncommitted}",
                "details": {
                    "branch": branch,
                    "commit": commit,
                    "uncommitted_changes": uncommitted
                }
            }

        except Exception as e:
            return {
                "status": "warn",
                "message": f"Git check failed: {e}",
                "details": {}
            }

    def check_disk_space(self) -> Dict:
        """Check available disk space"""
        if not PSUTIL_AVAILABLE:
            return {
                "status": "warn",
                "message": "Disk check skipped (psutil not available)",
                "details": {}
            }
        try:
            usage = psutil.disk_usage(str(self.repo_root))
            percent_used = usage.percent
            free_gb = usage.free / (1024**3)

            if percent_used > 90:
                status = "fail"
                message = f"Disk {percent_used:.1f}% full, only {free_gb:.1f} GB free (CRITICAL)"
            elif percent_used > 80:
                status = "warn"
                message = f"Disk {percent_used:.1f}% full, {free_gb:.1f} GB free (LOW)"
            else:
                status = "pass"
                message = f"Disk {percent_used:.1f}% used, {free_gb:.1f} GB free"

            return {
                "status": status,
                "message": message,
                "details": {
                    "total_gb": usage.total / (1024**3),
                    "used_gb": usage.used / (1024**3),
                    "free_gb": free_gb,
                    "percent": percent_used
                }
            }
        except Exception as e:
            return {
                "status": "warn",
                "message": f"Disk check failed: {e}",
                "details": {}
            }

    def check_memory(self) -> Dict:
        """Check system memory"""
        if not PSUTIL_AVAILABLE:
            return {
                "status": "warn",
                "message": "Memory check skipped (psutil not available)",
                "details": {}
            }
        try:
            mem = psutil.virtual_memory()
            percent_used = mem.percent
            free_gb = mem.available / (1024**3)

            if percent_used > 90:
                status = "fail"
                message = f"Memory {percent_used:.1f}% used, only {free_gb:.1f} GB free (CRITICAL)"
            elif percent_used > 80:
                status = "warn"
                message = f"Memory {percent_used:.1f}% used, {free_gb:.1f} GB free (HIGH)"
            else:
                status = "pass"
                message = f"Memory {percent_used:.1f}% used, {free_gb:.1f} GB available"

            return {
                "status": status,
                "message": message,
                "details": {
                    "total_gb": mem.total / (1024**3),
                    "used_gb": mem.used / (1024**3),
                    "free_gb": free_gb,
                    "percent": percent_used
                }
            }
        except Exception as e:
            return {
                "status": "warn",
                "message": f"Memory check failed: {e}",
                "details": {}
            }

    # ==================== FILE SYSTEM CHECKS ====================

    def check_critical_files(self) -> Dict:
        """Check for critical system files"""
        critical_files = [
            "voice_interface_v3_production.py",
            "nlp_query_processor.py",
            "enhanced_cyclotron_search.py",
            "migrations/002_fix_postgres_schema.sql",
            ".trinity/C2_WORK_ORDER_VOICE_INTERFACE_DOCS.md",
            ".trinity/C3_WORK_ORDER_PHASE_4_VALIDATION.md"
        ]

        missing = []
        found = []

        for file in critical_files:
            path = self.repo_root / file
            if path.exists():
                found.append(file)
            else:
                missing.append(file)

        if missing:
            return {
                "status": "warn",
                "message": f"{len(found)}/{len(critical_files)} critical files found, {len(missing)} missing",
                "details": {
                    "found": len(found),
                    "missing": missing
                }
            }
        else:
            return {
                "status": "pass",
                "message": f"All {len(critical_files)} critical files present",
                "details": {"found": len(found)}
            }

    def check_trinity_structure(self) -> Dict:
        """Check Trinity directory structure"""
        trinity_dir = self.repo_root / ".trinity"

        if not trinity_dir.exists():
            return {
                "status": "fail",
                "message": "Trinity directory not found",
                "details": {}
            }

        expected_dirs = ["messages", "LOCAL_HUB", "knowledge"]
        found_dirs = []
        missing_dirs = []

        for dir_name in expected_dirs:
            if (trinity_dir / dir_name).exists():
                found_dirs.append(dir_name)
            else:
                missing_dirs.append(dir_name)

        # Count files in Trinity
        trinity_files = list(trinity_dir.rglob("*"))
        trinity_files = [f for f in trinity_files if f.is_file()]

        if missing_dirs:
            return {
                "status": "warn",
                "message": f"Trinity: {len(trinity_files)} files, missing directories: {missing_dirs}",
                "details": {
                    "files": len(trinity_files),
                    "missing_dirs": missing_dirs
                }
            }
        else:
            return {
                "status": "pass",
                "message": f"Trinity: {len(trinity_files)} files, structure complete",
                "details": {"files": len(trinity_files)}
            }

    def check_logs_directory(self) -> Dict:
        """Check logs directory"""
        logs_dir = self.repo_root / "logs"

        if not logs_dir.exists():
            logs_dir.mkdir(exist_ok=True)
            return {
                "status": "pass",
                "message": "Logs directory created",
                "details": {"files": 0}
            }

        log_files = list(logs_dir.glob("*.log")) + list(logs_dir.glob("*.json"))
        total_size = sum(f.stat().st_size for f in log_files) / (1024**2)  # MB

        return {
            "status": "pass",
            "message": f"Logs: {len(log_files)} files, {total_size:.1f} MB",
            "details": {
                "files": len(log_files),
                "size_mb": total_size
            }
        }

    # ==================== DEPENDENCY CHECKS ====================

    def check_python_dependencies(self) -> Dict:
        """Check Python dependencies"""
        required = {
            "pathlib": "standard",
            "json": "standard",
            "datetime": "standard"
        }

        optional = {
            "flask": "API server",
            "openai": "Enhanced responses",
            "psutil": "System monitoring"
        }

        missing_required = []
        missing_optional = []
        available = []

        # Check required
        for package in required:
            try:
                __import__(package)
                available.append(package)
            except ImportError:
                missing_required.append(package)

        # Check optional
        for package in optional:
            try:
                __import__(package)
                available.append(package)
            except ImportError:
                missing_optional.append(package)

        if missing_required:
            return {
                "status": "fail",
                "message": f"Missing required packages: {missing_required}",
                "details": {
                    "available": len(available),
                    "missing_required": missing_required,
                    "missing_optional": missing_optional
                }
            }
        elif missing_optional:
            return {
                "status": "warn",
                "message": f"{len(available)} packages available, {len(missing_optional)} optional missing",
                "details": {
                    "available": len(available),
                    "missing_optional": missing_optional
                }
            }
        else:
            return {
                "status": "pass",
                "message": f"All {len(available)} packages available",
                "details": {"available": len(available)}
            }

    # ==================== VOICE INTERFACE CHECKS ====================

    def check_voice_interface(self) -> Dict:
        """Check Voice Interface components"""
        try:
            sys.path.insert(0, str(self.repo_root))
            from voice_interface_v3_production import VoiceInterfaceV3, Config

            config = Config()
            interface = VoiceInterfaceV3(config)
            kb_size = interface.initialize_knowledge_base()

            return {
                "status": "pass",
                "message": f"Voice Interface operational, {kb_size} items indexed",
                "details": {
                    "knowledge_base_size": kb_size,
                    "storage_path": str(config.storage_path)
                }
            }
        except Exception as e:
            return {
                "status": "fail",
                "message": f"Voice Interface error: {e}",
                "details": {"error": str(e)}
            }

    # ==================== DATABASE CHECKS ====================

    def check_database_migration(self) -> Dict:
        """Check database migration status"""
        migration_file = self.repo_root / "migrations" / "002_fix_postgres_schema.sql"

        if not migration_file.exists():
            return {
                "status": "fail",
                "message": "Database migration file missing",
                "details": {}
            }

        size = migration_file.stat().st_size
        with open(migration_file) as f:
            content = f.read()
            lines = len(content.split("\n"))

        return {
            "status": "pass",
            "message": f"Database migration ready ({lines} lines, {size} bytes)",
            "details": {
                "file": "002_fix_postgres_schema.sql",
                "lines": lines,
                "size": size
            }
        }

    # ==================== REPORT GENERATION ====================

    def generate_report(self):
        """Generate comprehensive health report"""
        print("\n" + "="*70)
        print("OVERKORE SYSTEM HEALTH CHECK")
        print("="*70)
        print(f"\nTimestamp: {self.results['timestamp']}")
        print(f"Platform: {self.results['platform']}")
        print(f"Hostname: {self.results['hostname']}")

        print("\n" + "="*70)
        print("CORE SYSTEM")
        print("="*70)
        self.check("Python Version", self.check_python_version)
        self.check("Git Repository", self.check_git_status)
        self.check("Disk Space", self.check_disk_space)
        self.check("Memory Usage", self.check_memory)

        print("\n" + "="*70)
        print("FILE SYSTEM")
        print("="*70)
        self.check("Critical Files", self.check_critical_files)
        self.check("Trinity Structure", self.check_trinity_structure)
        self.check("Logs Directory", self.check_logs_directory)

        print("\n" + "="*70)
        print("DEPENDENCIES")
        print("="*70)
        self.check("Python Packages", self.check_python_dependencies)

        print("\n" + "="*70)
        print("APPLICATIONS")
        print("="*70)
        self.check("Voice Interface", self.check_voice_interface)
        self.check("Database Migration", self.check_database_migration)

        # Summary
        print("\n" + "="*70)
        print("SUMMARY")
        print("="*70)

        total = self.results["summary"]["total"]
        passed = self.results["summary"]["passed"]
        warnings = self.results["summary"]["warnings"]
        failed = self.results["summary"]["failed"]

        print(f"\nTotal Checks: {total}")
        print(f"✅ Passed: {passed}")
        print(f"⚠️ Warnings: {warnings}")
        print(f"❌ Failed: {failed}")

        # Health score
        health_score = (passed / total * 100) if total > 0 else 0
        print(f"\nHealth Score: {health_score:.1f}%")

        if health_score >= 90:
            print("Overall Status: EXCELLENT ✅")
        elif health_score >= 75:
            print("Overall Status: GOOD ✅")
        elif health_score >= 60:
            print("Overall Status: FAIR ⚠️")
        else:
            print("Overall Status: POOR ❌")

        # Save report
        report_file = self.repo_root / "logs" / f"health_check_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        report_file.parent.mkdir(exist_ok=True)

        with open(report_file, 'w') as f:
            json.dump(self.results, f, indent=2)

        print(f"\nDetailed report saved to: {report_file}")

        return health_score >= 75  # True if health is good or better


def main():
    """Run system health check"""
    checker = SystemHealthCheck()
    success = checker.generate_report()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
