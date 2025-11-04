#!/usr/bin/env python3
"""
ERROR AGGREGATION DASHBOARD
Real-time error monitoring and aggregation across all systems.
Tracks errors, categorizes them, and generates actionable insights.
"""

import re
import json
import time
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict, List, Any, Optional

class ErrorAggregationDashboard:
    """
    Monitors and aggregates errors from:
    - Backend server logs
    - Frontend console logs
    - System error logs
    - Test reports
    - Instance reports
    Provides real-time dashboard and alerts.
    """

    def __init__(self):
        self.workspace = Path.home()
        self.errors = []
        self.error_categories = defaultdict(int)
        self.error_sources = defaultdict(int)
        self.error_timeline = []

        # Error patterns to detect
        self.error_patterns = [
            # Python errors
            (r'Traceback \(most recent call last\):', 'Python Exception'),
            (r'Error:', 'General Error'),
            (r'Exception:', 'Exception'),
            (r'WARNING:', 'Warning'),
            (r'CRITICAL:', 'Critical Error'),

            # JavaScript errors
            (r'TypeError:', 'JavaScript Type Error'),
            (r'ReferenceError:', 'JavaScript Reference Error'),
            (r'SyntaxError:', 'JavaScript Syntax Error'),
            (r'UnhandledPromiseRejection:', 'Unhandled Promise'),

            # HTTP errors
            (r'status: (4\d{2}|5\d{2})', 'HTTP Error'),
            (r'ECONNREFUSED', 'Connection Refused'),
            (r'ETIMEDOUT', 'Connection Timeout'),

            # Database errors
            (r'PostgreSQL|pg_|database error', 'Database Error'),
            (r'connection pool', 'Connection Pool Error'),

            # Authentication errors
            (r'Unauthorized|401', 'Auth Error'),
            (r'Forbidden|403', 'Permission Error'),
            (r'jwt|token', 'Token Error'),

            # System errors
            (r'out of memory', 'Memory Error'),
            (r'disk space', 'Disk Error'),
            (r'permission denied', 'Permission Error'),
        ]

    def scan_logs(self, log_paths: List[Path]):
        """Scan log files for errors"""
        print("\nScanning logs for errors...")

        for log_path in log_paths:
            if not log_path.exists():
                continue

            print(f"  Scanning: {log_path.name}")

            try:
                with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = f.readlines()

                    for line_num, line in enumerate(lines, 1):
                        error = self._detect_error(line, str(log_path), line_num)
                        if error:
                            self.errors.append(error)

            except Exception as e:
                print(f"    ⚠️  Could not read {log_path}: {e}")

    def scan_instance_reports(self):
        """Scan multi-instance reports for errors"""
        print("\nScanning instance reports...")

        reports_dir = self.workspace / '.multi_instance_hub' / 'reports'

        if not reports_dir.exists():
            return

        for report_file in reports_dir.glob('*.json'):
            try:
                with open(report_file, 'r', encoding='utf-8') as f:
                    report = json.load(f)

                    # Check for blockers
                    if report.get('blockers'):
                        for blocker in report['blockers']:
                            self.errors.append({
                                'timestamp': report.get('timestamp', datetime.now().isoformat()),
                                'source': f"Instance {report.get('instance_id', 'Unknown')}",
                                'category': 'Blocker',
                                'severity': 'HIGH',
                                'message': blocker,
                                'context': report_file.name
                            })

            except Exception as e:
                pass

    def _detect_error(self, line: str, source: str, line_num: int) -> Optional[Dict]:
        """Detect error in log line"""
        for pattern, category in self.error_patterns:
            if re.search(pattern, line, re.IGNORECASE):
                # Extract timestamp if present
                timestamp_match = re.search(r'\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}', line)
                timestamp = timestamp_match.group(0) if timestamp_match else datetime.now().isoformat()

                # Determine severity
                severity = self._determine_severity(line, category)

                error = {
                    'timestamp': timestamp,
                    'source': source,
                    'category': category,
                    'severity': severity,
                    'message': line.strip()[:200],  # First 200 chars
                    'line_number': line_num,
                    'context': line.strip()
                }

                # Update statistics
                self.error_categories[category] += 1
                self.error_sources[source] += 1

                return error

        return None

    def _determine_severity(self, line: str, category: str) -> str:
        """Determine error severity"""
        line_lower = line.lower()

        if any(word in line_lower for word in ['critical', 'fatal', 'crash', 'panic']):
            return 'CRITICAL'
        elif any(word in line_lower for word in ['error', 'exception', 'failed']):
            return 'HIGH'
        elif any(word in line_lower for word in ['warning', 'warn']):
            return 'MEDIUM'
        else:
            return 'LOW'

    def analyze_errors(self):
        """Analyze errors and generate insights"""
        print("\nAnalyzing errors...")

        # Group by time windows
        now = datetime.now()
        last_hour = []
        last_day = []

        for error in self.errors:
            try:
                error_time = datetime.fromisoformat(error['timestamp'].replace('Z', '+00:00'))

                if now - error_time < timedelta(hours=1):
                    last_hour.append(error)
                if now - error_time < timedelta(days=1):
                    last_day.append(error)
            except:
                # If timestamp parsing fails, include in analysis
                last_day.append(error)

        # Find most common errors
        error_messages = defaultdict(int)
        for error in self.errors:
            # Group similar errors
            simplified_message = re.sub(r'\d+', 'N', error['message'][:100])
            error_messages[simplified_message] += 1

        most_common = sorted(error_messages.items(), key=lambda x: x[1], reverse=True)[:10]

        return {
            'total_errors': len(self.errors),
            'errors_last_hour': len(last_hour),
            'errors_last_day': len(last_day),
            'by_category': dict(self.error_categories),
            'by_source': dict(self.error_sources),
            'by_severity': self._count_by_severity(),
            'most_common': most_common,
            'critical_errors': [e for e in self.errors if e['severity'] == 'CRITICAL'],
            'recent_errors': sorted(self.errors, key=lambda x: x['timestamp'], reverse=True)[:20]
        }

    def _count_by_severity(self) -> Dict[str, int]:
        """Count errors by severity"""
        severity_counts = {'CRITICAL': 0, 'HIGH': 0, 'MEDIUM': 0, 'LOW': 0}

        for error in self.errors:
            severity_counts[error['severity']] += 1

        return severity_counts

    def generate_html_dashboard(self, output_path: Path, analysis: Dict):
        """Generate beautiful error dashboard"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error Aggregation Dashboard</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #1a1a1a;
            color: #fff;
            padding: 20px;
        }}

        .container {{
            max-width: 1400px;
            margin: 0 auto;
        }}

        .header {{
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
            padding: 40px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
        }}

        .header h1 {{
            font-size: 36px;
            margin-bottom: 10px;
        }}

        .stats {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}

        .stat-card {{
            background: #2a2a2a;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            border: 2px solid;
        }}

        .stat-card h3 {{
            font-size: 48px;
            margin-bottom: 10px;
        }}

        .stat-card p {{
            color: #999;
            font-size: 14px;
        }}

        .stat-card.critical {{ border-color: #e74c3c; }}
        .stat-card.critical h3 {{ color: #e74c3c; }}

        .stat-card.high {{ border-color: #e67e22; }}
        .stat-card.high h3 {{ color: #e67e22; }}

        .stat-card.medium {{ border-color: #f39c12; }}
        .stat-card.medium h3 {{ color: #f39c12; }}

        .stat-card.total {{ border-color: #3498db; }}
        .stat-card.total h3 {{ color: #3498db; }}

        .section {{
            background: #2a2a2a;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 20px;
        }}

        .section h2 {{
            font-size: 24px;
            margin-bottom: 20px;
            color: #fff;
            border-bottom: 2px solid #444;
            padding-bottom: 10px;
        }}

        .error-list {{
            max-height: 600px;
            overflow-y: auto;
        }}

        .error-item {{
            background: #1a1a1a;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 15px;
            border-left: 4px solid;
        }}

        .error-item.critical {{ border-left-color: #e74c3c; }}
        .error-item.high {{ border-left-color: #e67e22; }}
        .error-item.medium {{ border-left-color: #f39c12; }}
        .error-item.low {{ border-left-color: #95a5a6; }}

        .error-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }}

        .error-category {{
            font-size: 16px;
            font-weight: 600;
            color: #fff;
        }}

        .error-severity {{
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }}

        .error-severity.critical {{ background: #e74c3c; color: white; }}
        .error-severity.high {{ background: #e67e22; color: white; }}
        .error-severity.medium {{ background: #f39c12; color: white; }}
        .error-severity.low {{ background: #95a5a6; color: white; }}

        .error-message {{
            font-family: 'Courier New', monospace;
            font-size: 13px;
            color: #ccc;
            margin-top: 10px;
            padding: 15px;
            background: rgba(0,0,0,0.3);
            border-radius: 5px;
            overflow-x: auto;
        }}

        .error-meta {{
            display: flex;
            gap: 20px;
            margin-top: 10px;
            font-size: 12px;
            color: #999;
        }}

        .chart-container {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }}

        .chart {{
            background: #1a1a1a;
            padding: 20px;
            border-radius: 8px;
        }}

        .chart h3 {{
            font-size: 18px;
            margin-bottom: 15px;
            color: #fff;
        }}

        .bar {{
            margin-bottom: 15px;
        }}

        .bar-label {{
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-size: 13px;
        }}

        .bar-fill {{
            height: 25px;
            background: linear-gradient(90deg, #e74c3c 0%, #c0392b 100%);
            border-radius: 5px;
            transition: width 0.3s;
        }}

        .refresh {{
            text-align: center;
            margin-top: 30px;
            padding: 20px;
            background: #2a2a2a;
            border-radius: 10px;
            font-size: 14px;
            color: #999;
        }}

        @media (max-width: 768px) {{
            .chart-container {{
                grid-template-columns: 1fr;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚨 Error Aggregation Dashboard</h1>
            <p>Real-time Error Monitoring & Analysis</p>
            <p style="font-size: 14px; margin-top: 10px; opacity: 0.8;">
                Generated {timestamp}
            </p>
        </div>

        <div class="stats">
            <div class="stat-card total">
                <h3>{analysis['total_errors']}</h3>
                <p>Total Errors</p>
            </div>
            <div class="stat-card critical">
                <h3>{analysis['by_severity']['CRITICAL']}</h3>
                <p>Critical</p>
            </div>
            <div class="stat-card high">
                <h3>{analysis['by_severity']['HIGH']}</h3>
                <p>High Severity</p>
            </div>
            <div class="stat-card medium">
                <h3>{analysis['errors_last_hour']}</h3>
                <p>Last Hour</p>
            </div>
        </div>

        <div class="chart-container">
            <div class="chart">
                <h3>Errors by Category</h3>
"""

        # Categories chart
        if analysis['by_category']:
            max_category = max(analysis['by_category'].values())
            for category, count in sorted(analysis['by_category'].items(), key=lambda x: x[1], reverse=True)[:10]:
                width = (count / max_category * 100) if max_category > 0 else 0
                html += f"""
                <div class="bar">
                    <div class="bar-label">
                        <span>{category}</span>
                        <span>{count}</span>
                    </div>
                    <div class="bar-fill" style="width: {width}%"></div>
                </div>
"""

        html += """
            </div>
            <div class="chart">
                <h3>Errors by Source</h3>
"""

        # Sources chart
        if analysis['by_source']:
            max_source = max(analysis['by_source'].values())
            for source, count in sorted(analysis['by_source'].items(), key=lambda x: x[1], reverse=True)[:10]:
                width = (count / max_source * 100) if max_source > 0 else 0
                source_name = Path(source).name if source else 'Unknown'
                html += f"""
                <div class="bar">
                    <div class="bar-label">
                        <span>{source_name[:30]}</span>
                        <span>{count}</span>
                    </div>
                    <div class="bar-fill" style="width: {width}%"></div>
                </div>
"""

        html += """
            </div>
        </div>

        <div class="section">
            <h2>🔥 Recent Errors</h2>
            <div class="error-list">
"""

        # Recent errors
        for error in analysis['recent_errors'][:50]:
            severity_class = error['severity'].lower()
            html += f"""
            <div class="error-item {severity_class}">
                <div class="error-header">
                    <div class="error-category">{error['category']}</div>
                    <span class="error-severity {severity_class}">{error['severity']}</span>
                </div>
                <div class="error-message">{error['message']}</div>
                <div class="error-meta">
                    <span>📁 {Path(error['source']).name}</span>
                    <span>⏰ {error['timestamp'][:19]}</span>
                    {'<span>📍 Line ' + str(error.get('line_number', 'N/A')) + '</span>' if error.get('line_number') else ''}
                </div>
            </div>
"""

        html += """
            </div>
        </div>

        <div class="refresh">
            Auto-refresh: Disabled | <a href="javascript:location.reload()" style="color: #3498db;">Refresh Now</a>
        </div>
    </div>
</body>
</html>"""

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html)

        print(f"\nHTML dashboard saved to: {output_path}")

    def generate_report(self, output_path: Path, analysis: Dict):
        """Generate text-based error report"""
        report = f"""ERROR AGGREGATION REPORT
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

{'=' * 70}
SUMMARY
{'=' * 70}

Total Errors: {analysis['total_errors']}
Errors (Last Hour): {analysis['errors_last_hour']}
Errors (Last Day): {analysis['errors_last_day']}

By Severity:
  CRITICAL: {analysis['by_severity']['CRITICAL']}
  HIGH: {analysis['by_severity']['HIGH']}
  MEDIUM: {analysis['by_severity']['MEDIUM']}
  LOW: {analysis['by_severity']['LOW']}

{'=' * 70}
TOP ERROR CATEGORIES
{'=' * 70}

"""

        for category, count in sorted(analysis['by_category'].items(), key=lambda x: x[1], reverse=True)[:10]:
            report += f"{category}: {count}\n"

        report += f"\n{'=' * 70}\n"
        report += "TOP ERROR SOURCES\n"
        report += f"{'=' * 70}\n\n"

        for source, count in sorted(analysis['by_source'].items(), key=lambda x: x[1], reverse=True)[:10]:
            report += f"{Path(source).name}: {count}\n"

        if analysis['critical_errors']:
            report += f"\n{'=' * 70}\n"
            report += "CRITICAL ERRORS (IMMEDIATE ATTENTION REQUIRED)\n"
            report += f"{'=' * 70}\n\n"

            for error in analysis['critical_errors'][:10]:
                report += f"Source: {Path(error['source']).name}\n"
                report += f"Time: {error['timestamp'][:19]}\n"
                report += f"Message: {error['message'][:150]}\n"
                report += "-" * 70 + "\n\n"

        report += f"\n{'=' * 70}\n"
        report += "MOST COMMON ERRORS\n"
        report += f"{'=' * 70}\n\n"

        for message, count in analysis['most_common'][:10]:
            report += f"[{count}x] {message[:100]}\n"

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(report)

        print(f"Text report saved to: {output_path}")

    def run(self):
        """Main execution"""
        print("=" * 70)
        print("ERROR AGGREGATION DASHBOARD")
        print("=" * 70)

        # Define log sources to scan
        log_sources = [
            # Instance hub logs
            self.workspace / '.multi_instance_hub' / 'hub.log',

            # Backend logs (if exist)
            self.workspace / '100X_BACKUP' / '100X_DEPLOYMENT' / 'BACKEND' / 'philosopher-ai' / 'server.log',
            self.workspace / '100X_BACKUP' / '100X_DEPLOYMENT' / 'BACKEND' / 'philosopher-ai' / 'error.log',

            # System logs
            self.workspace / 'error.log',
            self.workspace / 'system.log',

            # Test reports
            self.workspace / 'TEST_REPORT.json',
        ]

        # Scan all sources
        self.scan_logs(log_sources)
        self.scan_instance_reports()

        print(f"\nTotal errors found: {len(self.errors)}")

        # Analyze
        analysis = self.analyze_errors()

        # Print summary
        print("\n" + "=" * 70)
        print("ANALYSIS SUMMARY")
        print("=" * 70)
        print(f"Total Errors: {analysis['total_errors']}")
        print(f"Critical: {analysis['by_severity']['CRITICAL']}")
        print(f"High: {analysis['by_severity']['HIGH']}")
        print(f"Medium: {analysis['by_severity']['MEDIUM']}")
        print(f"Low: {analysis['by_severity']['LOW']}")

        # Generate outputs
        output_dir = self.workspace

        self.generate_html_dashboard(output_dir / 'ERROR_DASHBOARD.html', analysis)
        self.generate_report(output_dir / 'ERROR_REPORT.txt', analysis)

        print("\n" + "=" * 70)
        print("ERROR AGGREGATION COMPLETE")
        print("=" * 70)
        print(f"\nOutputs:")
        print(f"  Dashboard: {output_dir / 'ERROR_DASHBOARD.html'}")
        print(f"  Report: {output_dir / 'ERROR_REPORT.txt'}")

def main():
    """Main entry point"""
    dashboard = ErrorAggregationDashboard()
    dashboard.run()

if __name__ == '__main__':
    main()
