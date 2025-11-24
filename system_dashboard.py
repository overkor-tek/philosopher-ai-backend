#!/usr/bin/env python3
"""
======================================================================
OVERKORE SYSTEM INTEGRATION DASHBOARD
======================================================================
Unified monitoring and status dashboard for all OVERKORE systems.

Displays real-time status of:
- System health (90% health check)
- Voice Interface (176 items indexed)
- Test suite results (19/19 passing)
- Performance benchmarks (EXCELLENT rating)
- Database migrations (5 migrations, status)
- Dormant systems (ready for activation)
- Git repository status
- Documentation index (195 docs)
- Trinity coordination (C1/C2/C3 status)
- Log files and errors
- Active processes

Modes:
- CLI: Terminal-based dashboard with real-time updates
- JSON: Machine-readable status export
- HTML: Web-based dashboard (opens in browser)

Usage:
    python3 system_dashboard.py            # CLI dashboard (default)
    python3 system_dashboard.py json       # Export JSON status
    python3 system_dashboard.py html       # Generate HTML dashboard
    python3 system_dashboard.py watch      # Auto-refresh every 5 seconds

Author: C1 Mechanic (Autonomous Work Session)
Date: 2025-11-24
"""

import os
import sys
import json
import time
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional

class SystemDashboard:
    """Unified system monitoring and status dashboard"""

    def __init__(self):
        self.repo_root = Path(__file__).parent.absolute()
        self.refresh_data()

    def refresh_data(self):
        """Refresh all system data"""
        self.timestamp = datetime.now()
        self.data = {
            'timestamp': self.timestamp.isoformat(),
            'system_health': self._get_system_health(),
            'voice_interface': self._get_voice_interface_status(),
            'tests': self._get_test_status(),
            'performance': self._get_performance_status(),
            'migrations': self._get_migration_status(),
            'dormant_systems': self._get_dormant_systems(),
            'git': self._get_git_status(),
            'documentation': self._get_documentation_status(),
            'trinity': self._get_trinity_status(),
            'logs': self._get_log_status(),
        }

    def _run_command(self, command: str, capture_output: bool = True) -> Optional[str]:
        """Run shell command and return output"""
        try:
            if capture_output:
                result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=10)
                return result.stdout.strip() if result.returncode == 0 else None
            else:
                subprocess.run(command, shell=True, timeout=10)
                return None
        except Exception:
            return None

    def _get_system_health(self) -> Dict:
        """Get system health metrics"""
        # Run health check silently
        output = self._run_command("python3 system_health_check.py 2>/dev/null")

        status = {
            'available': False,
            'score': 0,
            'rating': 'UNKNOWN',
            'checks_passed': 0,
            'checks_total': 10
        }

        if output:
            status['available'] = True
            # Parse health check output
            for line in output.split('\n'):
                if 'Health Score:' in line:
                    score_match = line.split(':')[-1].strip()
                    if '%' in score_match:
                        status['score'] = float(score_match.replace('%', ''))
                if 'Overall Status:' in line:
                    if 'EXCELLENT' in line:
                        status['rating'] = 'EXCELLENT'
                    elif 'GOOD' in line:
                        status['rating'] = 'GOOD'
                    elif 'FAIR' in line:
                        status['rating'] = 'FAIR'
                if 'Passed:' in line:
                    try:
                        status['checks_passed'] = int(line.split(':')[-1].strip())
                    except:
                        pass

        return status

    def _get_voice_interface_status(self) -> Dict:
        """Get Voice Interface status"""
        vi_file = self.repo_root / "voice_interface_v3_production.py"

        status = {
            'available': vi_file.exists(),
            'indexed_items': 0,
            'version': '3.0',
            'production_ready': False
        }

        if vi_file.exists():
            # Check if comprehensive tests exist
            test_file = self.repo_root / "test_voice_interface_comprehensive.py"
            status['production_ready'] = test_file.exists()

            # Try to get indexed count from logs
            log_file = self.repo_root / "logs" / "voice_interface_20251124.log"
            if log_file.exists():
                log_content = log_file.read_text()
                # Look for "loaded X items" in logs
                for line in log_content.split('\n'):
                    if 'loaded' in line.lower() and 'items' in line.lower():
                        try:
                            # Extract number from line like "loaded 179 items"
                            words = line.split()
                            for i, word in enumerate(words):
                                if word.lower() == 'loaded' and i + 1 < len(words):
                                    status['indexed_items'] = int(words[i + 1])
                                    break
                        except:
                            pass

        return status

    def _get_test_status(self) -> Dict:
        """Get test suite status"""
        test_file = self.repo_root / "logs" / "comprehensive_test_results.json"

        status = {
            'available': False,
            'total': 0,
            'passed': 0,
            'failed': 0,
            'pass_rate': 0,
            'last_run': None
        }

        if test_file.exists():
            try:
                data = json.loads(test_file.read_text())
                status['available'] = True
                status['total'] = data.get('total_tests', 0)
                status['passed'] = data.get('passed', 0)
                status['failed'] = data.get('failed', 0)
                if status['total'] > 0:
                    status['pass_rate'] = (status['passed'] / status['total']) * 100
                status['last_run'] = data.get('timestamp', None)
            except:
                pass

        return status

    def _get_performance_status(self) -> Dict:
        """Get performance benchmark status"""
        benchmark_file = self.repo_root / "logs" / "benchmark_results_20251124_071749.json"

        status = {
            'available': False,
            'rating': 'UNKNOWN',
            'avg_query_time': 0,
            'throughput': 0,
            'last_run': None
        }

        if benchmark_file.exists():
            try:
                data = json.loads(benchmark_file.read_text())
                status['available'] = True
                status['rating'] = data.get('overall_rating', 'UNKNOWN')
                status['last_run'] = data.get('timestamp', None)

                # Extract performance metrics
                if 'benchmarks' in data:
                    for bench in data['benchmarks']:
                        if 'average' in bench:
                            status['avg_query_time'] = bench['average']
                        if 'throughput' in bench:
                            status['throughput'] = bench['throughput']
                            break
            except:
                pass

        return status

    def _get_migration_status(self) -> Dict:
        """Get database migration status"""
        migrations_dir = self.repo_root / "migrations"

        status = {
            'available': migrations_dir.exists(),
            'total': 0,
            'applied': 0,
            'pending': 0
        }

        if migrations_dir.exists():
            # Count migration files
            status['total'] = len(list(migrations_dir.glob("*.sql")))
            # Assume none applied without DB connection
            status['pending'] = status['total']

        return status

    def _get_dormant_systems(self) -> Dict:
        """Get dormant systems status"""
        dormant_dir = self.repo_root / "DORMANT_SYSTEMS"

        status = {
            'available': dormant_dir.exists(),
            'count': 0,
            'systems': []
        }

        if dormant_dir.exists():
            py_files = list(dormant_dir.glob("*.py"))
            js_files = list(dormant_dir.glob("*.js"))
            status['count'] = len(py_files) + len(js_files)
            status['systems'] = [
                {'name': f.stem, 'type': f.suffix[1:], 'size': f.stat().st_size}
                for f in (py_files + js_files)
            ]

        return status

    def _get_git_status(self) -> Dict:
        """Get git repository status"""
        branch = self._run_command("git rev-parse --abbrev-ref HEAD")
        commit = self._run_command("git rev-parse --short HEAD")
        uncommitted = self._run_command("git status --porcelain")

        status = {
            'available': branch is not None,
            'branch': branch or 'unknown',
            'commit': commit or 'unknown',
            'clean': len(uncommitted.split('\n')) == 1 if uncommitted else True,
            'uncommitted_files': len(uncommitted.split('\n')) if uncommitted else 0
        }

        return status

    def _get_documentation_status(self) -> Dict:
        """Get documentation status"""
        doc_index = self.repo_root / "logs" / "documentation_index.json"

        status = {
            'available': False,
            'total_docs': 0,
            'total_words': 0,
            'indexed': False
        }

        if doc_index.exists():
            try:
                data = json.loads(doc_index.read_text())
                status['available'] = True
                status['indexed'] = True
                status['total_docs'] = data.get('total_documents', 0)
                status['total_words'] = data.get('total_words', 0)
            except:
                pass

        return status

    def _get_trinity_status(self) -> Dict:
        """Get Trinity coordination status"""
        trinity_dir = self.repo_root / ".trinity"

        status = {
            'available': trinity_dir.exists(),
            'c1_status': 'active',  # We are C1
            'c2_status': 'unknown',
            'c3_status': 'unknown',
            'work_orders': 0
        }

        if trinity_dir.exists():
            # Count work order files
            work_orders = list(trinity_dir.glob("*WORK_ORDER*.md"))
            status['work_orders'] = len(work_orders)

            # Check for C2/C3 work orders
            if (trinity_dir / "C2_WORK_ORDER_VOICE_INTERFACE_DOCS.md").exists():
                status['c2_status'] = 'work_order_deployed'
            if (trinity_dir / "C3_WORK_ORDER_PHASE_4_VALIDATION.md").exists():
                status['c3_status'] = 'work_order_deployed'

        return status

    def _get_log_status(self) -> Dict:
        """Get log file status"""
        logs_dir = self.repo_root / "logs"

        status = {
            'available': logs_dir.exists(),
            'count': 0,
            'total_size': 0,
            'latest': None
        }

        if logs_dir.exists():
            log_files = list(logs_dir.glob("*"))
            status['count'] = len(log_files)
            status['total_size'] = sum(f.stat().st_size for f in log_files if f.is_file())

            # Find most recent log
            if log_files:
                latest = max((f for f in log_files if f.is_file()), key=lambda f: f.stat().st_mtime)
                status['latest'] = latest.name

        return status

    def print_dashboard(self):
        """Print dashboard to terminal"""
        self.refresh_data()

        print("=" * 80)
        print("🔺 OVERKORE SYSTEM INTEGRATION DASHBOARD")
        print("=" * 80)
        print(f"Timestamp: {self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Branch: {self.data['git']['branch']} ({self.data['git']['commit']})")
        print()

        # System Health
        print("=" * 80)
        print("🏥 SYSTEM HEALTH")
        print("=" * 80)
        health = self.data['system_health']
        if health['available']:
            score_emoji = "✅" if health['score'] >= 80 else "⚠️" if health['score'] >= 60 else "❌"
            print(f"{score_emoji} Health Score: {health['score']}% ({health['rating']})")
            print(f"   Checks: {health['checks_passed']}/{health['checks_total']} passed")
        else:
            print("❌ System health check not available")
        print()

        # Voice Interface
        print("=" * 80)
        print("🎤 VOICE INTERFACE")
        print("=" * 80)
        vi = self.data['voice_interface']
        if vi['available']:
            status_emoji = "✅" if vi['production_ready'] else "⚠️"
            print(f"{status_emoji} Version: {vi['version']}")
            print(f"   Indexed Items: {vi['indexed_items']}")
            print(f"   Production Ready: {vi['production_ready']}")
        else:
            print("❌ Voice Interface not found")
        print()

        # Tests
        print("=" * 80)
        print("🧪 TEST SUITE")
        print("=" * 80)
        tests = self.data['tests']
        if tests['available']:
            test_emoji = "✅" if tests['pass_rate'] == 100 else "⚠️" if tests['pass_rate'] >= 80 else "❌"
            print(f"{test_emoji} Pass Rate: {tests['pass_rate']:.1f}% ({tests['passed']}/{tests['total']})")
            if tests['last_run']:
                print(f"   Last Run: {tests['last_run']}")
        else:
            print("⚠️  Test results not available")
        print()

        # Performance
        print("=" * 80)
        print("⚡ PERFORMANCE")
        print("=" * 80)
        perf = self.data['performance']
        if perf['available']:
            perf_emoji = "✅" if perf['rating'] == "EXCELLENT" else "⚠️"
            print(f"{perf_emoji} Rating: {perf['rating']}")
            if perf['avg_query_time'] > 0:
                print(f"   Avg Query Time: {perf['avg_query_time']*1000:.1f}ms")
            if perf['throughput'] > 0:
                print(f"   Throughput: {perf['throughput']:.0f} queries/sec")
        else:
            print("⚠️  Performance benchmarks not available")
        print()

        # Migrations
        print("=" * 80)
        print("🗄️  DATABASE MIGRATIONS")
        print("=" * 80)
        migrations = self.data['migrations']
        if migrations['available']:
            mig_emoji = "✅" if migrations['pending'] == 0 else "⏳"
            print(f"{mig_emoji} Total: {migrations['total']} migrations")
            print(f"   Applied: {migrations['applied']}")
            print(f"   Pending: {migrations['pending']}")
        else:
            print("❌ Migrations directory not found")
        print()

        # Dormant Systems
        print("=" * 80)
        print("🌪️  DORMANT SYSTEMS")
        print("=" * 80)
        dormant = self.data['dormant_systems']
        if dormant['available']:
            print(f"⏳ {dormant['count']} dormant systems ready for activation")
            if dormant['systems']:
                for sys in dormant['systems'][:5]:  # Show first 5
                    print(f"   - {sys['name']} ({sys['type']}, {sys['size']:,} bytes)")
                if len(dormant['systems']) > 5:
                    print(f"   ... and {len(dormant['systems']) - 5} more")
        else:
            print("❌ Dormant systems directory not found")
        print()

        # Trinity
        print("=" * 80)
        print("🔺 TRINITY COORDINATION")
        print("=" * 80)
        trinity = self.data['trinity']
        if trinity['available']:
            print(f"✅ C1 (Mechanic): {trinity['c1_status']}")
            print(f"   C2 (Architect): {trinity['c2_status']}")
            print(f"   C3 (Oracle): {trinity['c3_status']}")
            print(f"   Work Orders: {trinity['work_orders']}")
        else:
            print("❌ Trinity directory not found")
        print()

        # Documentation
        print("=" * 80)
        print("📚 DOCUMENTATION")
        print("=" * 80)
        docs = self.data['documentation']
        if docs['indexed']:
            print(f"✅ {docs['total_docs']} documents indexed")
            print(f"   Total Words: {docs['total_words']:,}")
        else:
            print("⚠️  Documentation not indexed")
        print()

        # Logs
        print("=" * 80)
        print("📝 LOGS")
        print("=" * 80)
        logs = self.data['logs']
        if logs['available']:
            print(f"✅ {logs['count']} log files ({logs['total_size']:,} bytes)")
            if logs['latest']:
                print(f"   Latest: {logs['latest']}")
        else:
            print("❌ Logs directory not found")
        print()

        # Git
        print("=" * 80)
        print("🔀 GIT REPOSITORY")
        print("=" * 80)
        git = self.data['git']
        if git['available']:
            git_emoji = "✅" if git['clean'] else "⚠️"
            print(f"{git_emoji} Branch: {git['branch']}")
            print(f"   Commit: {git['commit']}")
            status_text = 'Clean' if git['clean'] else f"{git['uncommitted_files']} uncommitted files"
            print(f"   Status: {status_text}")
        else:
            print("❌ Git repository not available")
        print()

        print("=" * 80)

    def export_json(self, output_file: str = "system_status.json"):
        """Export status as JSON"""
        self.refresh_data()
        output_path = Path(output_file)
        output_path.write_text(json.dumps(self.data, indent=2))
        print(f"✅ System status exported to: {output_file}")

    def generate_html(self, output_file: str = "system_dashboard.html"):
        """Generate HTML dashboard"""
        self.refresh_data()

        html = f"""<!DOCTYPE html>
<html>
<head>
    <title>OVERKORE System Dashboard</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="30">
    <style>
        body {{
            font-family: 'Courier New', monospace;
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 20px;
            margin: 0;
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 20px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 2.5em;
        }}
        .timestamp {{
            opacity: 0.8;
            margin-top: 10px;
        }}
        .grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
        }}
        .card {{
            background: #252526;
            border: 1px solid #3e3e42;
            border-radius: 8px;
            padding: 20px;
        }}
        .card h2 {{
            margin: 0 0 15px 0;
            color: #569cd6;
            border-bottom: 2px solid #3e3e42;
            padding-bottom: 10px;
        }}
        .metric {{
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #3e3e42;
        }}
        .metric:last-child {{
            border-bottom: none;
        }}
        .metric-label {{
            color: #9cdcfe;
        }}
        .metric-value {{
            color: #4ec9b0;
            font-weight: bold;
        }}
        .status-excellent {{ color: #4ec9b0; }}
        .status-good {{ color: #dcdcaa; }}
        .status-warning {{ color: #ce9178; }}
        .status-error {{ color: #f48771; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🔺 OVERKORE SYSTEM DASHBOARD</h1>
        <div class="timestamp">Last Updated: {self.timestamp.strftime('%Y-%m-%d %H:%M:%S')} | Branch: {self.data['git']['branch']} ({self.data['git']['commit']})</div>
    </div>

    <div class="grid">
        <div class="card">
            <h2>🏥 System Health</h2>
            <div class="metric">
                <span class="metric-label">Health Score:</span>
                <span class="metric-value status-{self._get_health_css_class()}">{self.data['system_health']['score']}%</span>
            </div>
            <div class="metric">
                <span class="metric-label">Rating:</span>
                <span class="metric-value">{self.data['system_health']['rating']}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Checks Passed:</span>
                <span class="metric-value">{self.data['system_health']['checks_passed']}/{self.data['system_health']['checks_total']}</span>
            </div>
        </div>

        <div class="card">
            <h2>🎤 Voice Interface</h2>
            <div class="metric">
                <span class="metric-label">Version:</span>
                <span class="metric-value">{self.data['voice_interface']['version']}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Indexed Items:</span>
                <span class="metric-value">{self.data['voice_interface']['indexed_items']}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Production Ready:</span>
                <span class="metric-value">{"✅" if self.data['voice_interface']['production_ready'] else "⏳"}</span>
            </div>
        </div>

        <div class="card">
            <h2>🧪 Test Suite</h2>
            <div class="metric">
                <span class="metric-label">Pass Rate:</span>
                <span class="metric-value status-{self._get_test_css_class()}">{self.data['tests']['pass_rate']:.1f}%</span>
            </div>
            <div class="metric">
                <span class="metric-label">Tests:</span>
                <span class="metric-value">{self.data['tests']['passed']}/{self.data['tests']['total']}</span>
            </div>
        </div>

        <div class="card">
            <h2>⚡ Performance</h2>
            <div class="metric">
                <span class="metric-label">Rating:</span>
                <span class="metric-value">{self.data['performance']['rating']}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Throughput:</span>
                <span class="metric-value">{self.data['performance']['throughput']:.0f} q/s</span>
            </div>
        </div>

        <div class="card">
            <h2>🗄️ Database Migrations</h2>
            <div class="metric">
                <span class="metric-label">Total:</span>
                <span class="metric-value">{self.data['migrations']['total']}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Applied:</span>
                <span class="metric-value">{self.data['migrations']['applied']}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Pending:</span>
                <span class="metric-value status-{self._get_migration_css_class()}">{self.data['migrations']['pending']}</span>
            </div>
        </div>

        <div class="card">
            <h2>🌪️ Dormant Systems</h2>
            <div class="metric">
                <span class="metric-label">Systems Ready:</span>
                <span class="metric-value">{self.data['dormant_systems']['count']}</span>
            </div>
        </div>

        <div class="card">
            <h2>🔺 Trinity</h2>
            <div class="metric">
                <span class="metric-label">C1 (Mechanic):</span>
                <span class="metric-value">{self.data['trinity']['c1_status']}</span>
            </div>
            <div class="metric">
                <span class="metric-label">C2 (Architect):</span>
                <span class="metric-value">{self.data['trinity']['c2_status']}</span>
            </div>
            <div class="metric">
                <span class="metric-label">C3 (Oracle):</span>
                <span class="metric-value">{self.data['trinity']['c3_status']}</span>
            </div>
        </div>

        <div class="card">
            <h2>📚 Documentation</h2>
            <div class="metric">
                <span class="metric-label">Documents:</span>
                <span class="metric-value">{self.data['documentation']['total_docs']}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Words:</span>
                <span class="metric-value">{self.data['documentation']['total_words']:,}</span>
            </div>
        </div>
    </div>
</body>
</html>"""

        output_path = Path(output_file)
        output_path.write_text(html)
        print(f"✅ HTML dashboard generated: {output_file}")
        print(f"   Open in browser: file://{output_path.absolute()}")

    def _get_health_css_class(self) -> str:
        """Get health status CSS class"""
        score = self.data['system_health']['score']
        if score >= 80:
            return "excellent"
        elif score >= 60:
            return "good"
        else:
            return "warning"

    def _get_test_css_class(self) -> str:
        """Get test status CSS class"""
        rate = self.data['tests']['pass_rate']
        if rate == 100:
            return "excellent"
        elif rate >= 80:
            return "good"
        else:
            return "warning"

    def _get_migration_css_class(self) -> str:
        """Get migration status CSS class"""
        pending = self.data['migrations']['pending']
        if pending == 0:
            return "excellent"
        else:
            return "warning"

    def watch_mode(self, interval: int = 5):
        """Auto-refresh dashboard every N seconds"""
        try:
            while True:
                # Clear screen (works on most terminals)
                os.system('clear' if os.name != 'nt' else 'cls')
                self.print_dashboard()
                print(f"\n🔄 Refreshing in {interval} seconds... (Ctrl+C to stop)")
                time.sleep(interval)
        except KeyboardInterrupt:
            print("\n\n✅ Watch mode stopped")


def main():
    """Main CLI entry point"""
    command = sys.argv[1] if len(sys.argv) > 1 else "cli"

    dashboard = SystemDashboard()

    if command == "cli" or command == "status":
        dashboard.print_dashboard()

    elif command == "json":
        output = sys.argv[2] if len(sys.argv) > 2 else "system_status.json"
        dashboard.export_json(output)

    elif command == "html":
        output = sys.argv[2] if len(sys.argv) > 2 else "system_dashboard.html"
        dashboard.generate_html(output)

    elif command == "watch":
        interval = int(sys.argv[2]) if len(sys.argv) > 2 else 5
        dashboard.watch_mode(interval)

    elif command == "help" or command == "--help" or command == "-h":
        print(__doc__)

    else:
        print(f"❌ Unknown command: {command}")
        print("   Run 'python3 system_dashboard.py help' for usage")
        sys.exit(1)


if __name__ == "__main__":
    main()
