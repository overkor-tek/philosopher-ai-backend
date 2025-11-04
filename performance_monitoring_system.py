#!/usr/bin/env python3
"""
PERFORMANCE MONITORING SYSTEM
Real-time system performance tracking and analysis.
Monitors response times, resource usage, and generates performance insights.
"""

import psutil
import requests
import time
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Any
from collections import deque

class PerformanceMonitor:
    """
    Monitors system performance:
    - API response times
    - CPU usage
    - Memory usage
    - Disk I/O
    - Network traffic
    - Performance trends
    """

    def __init__(self, api_base_url: str = "http://localhost:3002"):
        self.api_base_url = api_base_url
        self.metrics_history = deque(maxlen=1000)  # Last 1000 measurements
        self.api_metrics = {}
        self.system_metrics = {}

    def measure_api_performance(self):
        """Measure API endpoint performance"""
        print("\nMeasuring API performance...")

        endpoints = [
            ('GET', '/api/v1/health'),
            ('GET', '/api/v1/nav/rooms'),
            ('GET', '/api/v1/knowledge/search?q=test'),
        ]

        for method, path in endpoints:
            url = f"{self.api_base_url}{path}"

            try:
                start_time = time.time()
                response = requests.get(url, timeout=5)
                response_time = (time.time() - start_time) * 1000  # ms

                metric = {
                    'endpoint': path,
                    'method': method,
                    'response_time': round(response_time, 2),
                    'status_code': response.status_code,
                    'timestamp': datetime.now().isoformat(),
                    'success': response.status_code < 400
                }

                if path not in self.api_metrics:
                    self.api_metrics[path] = []

                self.api_metrics[path].append(metric)

                print(f"  {method} {path}: {response_time:.2f}ms ({response.status_code})")

            except Exception as e:
                print(f"  {method} {path}: ERROR - {e}")

    def measure_system_performance(self):
        """Measure system resource usage"""
        print("\nMeasuring system performance...")

        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()

        # Memory usage
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        memory_used_gb = memory.used / (1024 ** 3)
        memory_total_gb = memory.total / (1024 ** 3)

        # Disk usage
        disk = psutil.disk_usage('/')
        disk_percent = disk.percent
        disk_used_gb = disk.used / (1024 ** 3)
        disk_total_gb = disk.total / (1024 ** 3)

        # Network I/O
        net_io = psutil.net_io_counters()
        bytes_sent_mb = net_io.bytes_sent / (1024 ** 2)
        bytes_recv_mb = net_io.bytes_recv / (1024 ** 2)

        metric = {
            'timestamp': datetime.now().isoformat(),
            'cpu': {
                'percent': cpu_percent,
                'count': cpu_count
            },
            'memory': {
                'percent': memory_percent,
                'used_gb': round(memory_used_gb, 2),
                'total_gb': round(memory_total_gb, 2)
            },
            'disk': {
                'percent': disk_percent,
                'used_gb': round(disk_used_gb, 2),
                'total_gb': round(disk_total_gb, 2)
            },
            'network': {
                'sent_mb': round(bytes_sent_mb, 2),
                'recv_mb': round(bytes_recv_mb, 2)
            }
        }

        self.metrics_history.append(metric)
        self.system_metrics = metric

        print(f"  CPU: {cpu_percent}% ({cpu_count} cores)")
        print(f"  Memory: {memory_percent}% ({memory_used_gb:.1f}GB / {memory_total_gb:.1f}GB)")
        print(f"  Disk: {disk_percent}% ({disk_used_gb:.1f}GB / {disk_total_gb:.1f}GB)")

    def analyze_performance(self) -> Dict[str, Any]:
        """Analyze performance metrics and generate insights"""
        print("\nAnalyzing performance...")

        analysis = {
            'api_performance': {},
            'system_health': {},
            'recommendations': []
        }

        # Analyze API performance
        for endpoint, metrics in self.api_metrics.items():
            response_times = [m['response_time'] for m in metrics]

            if response_times:
                analysis['api_performance'][endpoint] = {
                    'avg_response_time': round(sum(response_times) / len(response_times), 2),
                    'min_response_time': round(min(response_times), 2),
                    'max_response_time': round(max(response_times), 2),
                    'total_requests': len(metrics),
                    'success_rate': round(sum(1 for m in metrics if m['success']) / len(metrics) * 100, 1)
                }

                # Recommendations based on response times
                avg_time = analysis['api_performance'][endpoint]['avg_response_time']
                if avg_time > 1000:
                    analysis['recommendations'].append({
                        'type': 'SLOW_ENDPOINT',
                        'severity': 'HIGH',
                        'message': f'{endpoint} is slow ({avg_time}ms)',
                        'suggestion': 'Optimize database queries, add caching, or implement pagination'
                    })
                elif avg_time > 500:
                    analysis['recommendations'].append({
                        'type': 'MODERATE_LATENCY',
                        'severity': 'MEDIUM',
                        'message': f'{endpoint} has moderate latency ({avg_time}ms)',
                        'suggestion': 'Consider query optimization or caching'
                    })

        # Analyze system health
        if self.system_metrics:
            cpu = self.system_metrics['cpu']['percent']
            memory = self.system_metrics['memory']['percent']
            disk = self.system_metrics['disk']['percent']

            analysis['system_health'] = {
                'cpu_status': 'CRITICAL' if cpu > 90 else 'WARNING' if cpu > 75 else 'OK',
                'memory_status': 'CRITICAL' if memory > 90 else 'WARNING' if memory > 75 else 'OK',
                'disk_status': 'CRITICAL' if disk > 90 else 'WARNING' if disk > 75 else 'OK',
                'overall_status': 'OK'
            }

            # CPU recommendations
            if cpu > 90:
                analysis['recommendations'].append({
                    'type': 'HIGH_CPU',
                    'severity': 'CRITICAL',
                    'message': f'CPU usage is critical ({cpu}%)',
                    'suggestion': 'Scale horizontally, optimize heavy processes, or increase CPU resources'
                })
            elif cpu > 75:
                analysis['recommendations'].append({
                    'type': 'ELEVATED_CPU',
                    'severity': 'WARNING',
                    'message': f'CPU usage is elevated ({cpu}%)',
                    'suggestion': 'Monitor for prolonged high usage, consider optimization'
                })

            # Memory recommendations
            if memory > 90:
                analysis['recommendations'].append({
                    'type': 'HIGH_MEMORY',
                    'severity': 'CRITICAL',
                    'message': f'Memory usage is critical ({memory}%)',
                    'suggestion': 'Check for memory leaks, clear caches, or increase RAM'
                })
            elif memory > 75:
                analysis['recommendations'].append({
                    'type': 'ELEVATED_MEMORY',
                    'severity': 'WARNING',
                    'message': f'Memory usage is elevated ({memory}%)',
                    'suggestion': 'Monitor memory trends, consider garbage collection tuning'
                })

            # Disk recommendations
            if disk > 90:
                analysis['recommendations'].append({
                    'type': 'LOW_DISK_SPACE',
                    'severity': 'CRITICAL',
                    'message': f'Disk space is critical ({disk}%)',
                    'suggestion': 'Clean up logs, remove unused files, or expand disk'
                })

        return analysis

    def generate_html_dashboard(self, output_path: Path, analysis: Dict):
        """Generate performance monitoring dashboard"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Monitoring Dashboard</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}

        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }}

        .container {{ max-width: 1400px; margin: 0 auto; }}

        .header {{
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-bottom: 30px;
            text-align: center;
        }}

        .header h1 {{ font-size: 36px; color: #667eea; margin-bottom: 10px; }}

        .stats {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}

        .stat-card {{
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            text-align: center;
        }}

        .stat-card h3 {{ font-size: 48px; margin-bottom: 10px; }}

        .stat-card.ok h3 {{ color: #4caf50; }}
        .stat-card.warning h3 {{ color: #ff9800; }}
        .stat-card.critical h3 {{ color: #f44336; }}

        .section {{
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }}

        .section h2 {{
            font-size: 24px;
            margin-bottom: 20px;
            color: #333;
            border-bottom: 2px solid #f0f0f0;
            padding-bottom: 10px;
        }}

        .metric-row {{
            display: flex;
            justify-content: space-between;
            padding: 15px;
            border-bottom: 1px solid #f0f0f0;
        }}

        .metric-row:last-child {{ border-bottom: none; }}

        .progress-bar {{
            width: 100%;
            height: 30px;
            background: #e0e0e0;
            border-radius: 15px;
            overflow: hidden;
            margin-top: 10px;
        }}

        .progress-fill {{
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
            transition: width 0.3s;
        }}

        .progress-fill.ok {{ background: #4caf50; }}
        .progress-fill.warning {{ background: #ff9800; }}
        .progress-fill.critical {{ background: #f44336; }}

        .recommendation {{
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 15px;
            border-left: 4px solid;
        }}

        .recommendation.critical {{ border-left-color: #f44336; background: #ffebee; }}
        .recommendation.warning {{ border-left-color: #ff9800; background: #fff3e0; }}
        .recommendation.medium {{ border-left-color: #ff9800; background: #fff3e0; }}
        .recommendation.high {{ border-left-color: #f44336; background: #ffebee; }}

        .badge {{
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            color: white;
        }}

        .badge.critical {{ background: #f44336; }}
        .badge.warning {{ background: #ff9800; }}
        .badge.medium {{ background: #ff9800; }}
        .badge.high {{ background: #f44336; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚡ Performance Monitoring</h1>
            <p>Real-time System & API Performance</p>
            <p style="font-size: 14px; color: #999; margin-top: 10px;">
                Generated {timestamp}
            </p>
        </div>

        <div class="stats">
            <div class="stat-card {analysis['system_health'].get('cpu_status', 'ok').lower()}">
                <h3>{self.system_metrics.get('cpu', {}).get('percent', 0):.1f}%</h3>
                <p>CPU Usage</p>
            </div>
            <div class="stat-card {analysis['system_health'].get('memory_status', 'ok').lower()}">
                <h3>{self.system_metrics.get('memory', {}).get('percent', 0):.1f}%</h3>
                <p>Memory Usage</p>
            </div>
            <div class="stat-card {analysis['system_health'].get('disk_status', 'ok').lower()}">
                <h3>{self.system_metrics.get('disk', {}).get('percent', 0):.1f}%</h3>
                <p>Disk Usage</p>
            </div>
            <div class="stat-card ok">
                <h3>{len(self.api_metrics)}</h3>
                <p>Endpoints Monitored</p>
            </div>
        </div>

        <div class="section">
            <h2>🚀 API Performance</h2>
"""

        for endpoint, metrics in analysis['api_performance'].items():
            avg_time = metrics['avg_response_time']
            status_class = 'critical' if avg_time > 1000 else 'warning' if avg_time > 500 else 'ok'

            html += f"""
            <div class="metric-row">
                <div style="flex: 1;">
                    <strong>{endpoint}</strong>
                    <br>
                    <small style="color: #666;">
                        Avg: {metrics['avg_response_time']}ms |
                        Min: {metrics['min_response_time']}ms |
                        Max: {metrics['max_response_time']}ms |
                        Success: {metrics['success_rate']}%
                    </small>
                </div>
                <div style="width: 200px;">
                    <div class="progress-bar">
                        <div class="progress-fill {status_class}" style="width: {min(100, avg_time / 10)}%">
                            {avg_time}ms
                        </div>
                    </div>
                </div>
            </div>
"""

        html += """
        </div>

        <div class="section">
            <h2>💻 System Resources</h2>
"""

        # CPU
        cpu = self.system_metrics.get('cpu', {})
        cpu_percent = cpu.get('percent', 0)
        cpu_status = 'critical' if cpu_percent > 90 else 'warning' if cpu_percent > 75 else 'ok'

        html += f"""
            <div class="metric-row">
                <div>
                    <strong>CPU</strong>
                    <br>
                    <small style="color: #666;">{cpu.get('count', 0)} cores</small>
                </div>
                <div style="flex: 1; margin-left: 20px;">
                    <div class="progress-bar">
                        <div class="progress-fill {cpu_status}" style="width: {cpu_percent}%">
                            {cpu_percent:.1f}%
                        </div>
                    </div>
                </div>
            </div>
"""

        # Memory
        memory = self.system_metrics.get('memory', {})
        memory_percent = memory.get('percent', 0)
        memory_status = 'critical' if memory_percent > 90 else 'warning' if memory_percent > 75 else 'ok'

        html += f"""
            <div class="metric-row">
                <div>
                    <strong>Memory</strong>
                    <br>
                    <small style="color: #666;">{memory.get('used_gb', 0):.1f}GB / {memory.get('total_gb', 0):.1f}GB</small>
                </div>
                <div style="flex: 1; margin-left: 20px;">
                    <div class="progress-bar">
                        <div class="progress-fill {memory_status}" style="width: {memory_percent}%">
                            {memory_percent:.1f}%
                        </div>
                    </div>
                </div>
            </div>
"""

        # Disk
        disk = self.system_metrics.get('disk', {})
        disk_percent = disk.get('percent', 0)
        disk_status = 'critical' if disk_percent > 90 else 'warning' if disk_percent > 75 else 'ok'

        html += f"""
            <div class="metric-row">
                <div>
                    <strong>Disk</strong>
                    <br>
                    <small style="color: #666;">{disk.get('used_gb', 0):.1f}GB / {disk.get('total_gb', 0):.1f}GB</small>
                </div>
                <div style="flex: 1; margin-left: 20px;">
                    <div class="progress-bar">
                        <div class="progress-fill {disk_status}" style="width: {disk_percent}%">
                            {disk_percent:.1f}%
                        </div>
                    </div>
                </div>
            </div>
"""

        html += """
        </div>

        <div class="section">
            <h2>💡 Recommendations</h2>
"""

        if analysis['recommendations']:
            for rec in analysis['recommendations']:
                severity_class = rec['severity'].lower()
                html += f"""
            <div class="recommendation {severity_class}">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <strong>{rec['message']}</strong>
                    <span class="badge {severity_class}">{rec['severity']}</span>
                </div>
                <p style="color: #666; font-size: 14px;">
                    💡 {rec['suggestion']}
                </p>
            </div>
"""
        else:
            html += """
            <p style="color: #4caf50; font-weight: 600;">✅ All systems operating optimally. No recommendations at this time.</p>
"""

        html += """
        </div>
    </div>
</body>
</html>"""

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html)

        print(f"\nHTML dashboard saved to: {output_path}")

    def run(self):
        """Main execution"""
        print("=" * 70)
        print("PERFORMANCE MONITORING SYSTEM")
        print("=" * 70)

        # Measure performance
        try:
            self.measure_api_performance()
        except Exception as e:
            print(f"⚠️  Could not measure API performance: {e}")

        self.measure_system_performance()

        # Analyze
        analysis = self.analyze_performance()

        # Print summary
        print("\n" + "=" * 70)
        print("PERFORMANCE SUMMARY")
        print("=" * 70)

        if self.system_metrics:
            print(f"CPU: {self.system_metrics['cpu']['percent']}% - {analysis['system_health'].get('cpu_status', 'UNKNOWN')}")
            print(f"Memory: {self.system_metrics['memory']['percent']}% - {analysis['system_health'].get('memory_status', 'UNKNOWN')}")
            print(f"Disk: {self.system_metrics['disk']['percent']}% - {analysis['system_health'].get('disk_status', 'UNKNOWN')}")

        if analysis['recommendations']:
            print(f"\nRecommendations: {len(analysis['recommendations'])}")
            for rec in analysis['recommendations'][:5]:
                print(f"  [{rec['severity']}] {rec['message']}")

        # Generate dashboard
        output_dir = Path.home()
        self.generate_html_dashboard(output_dir / 'PERFORMANCE_DASHBOARD.html', analysis)

        print("\n" + "=" * 70)
        print("MONITORING COMPLETE")
        print("=" * 70)
        print(f"\nDashboard: {output_dir / 'PERFORMANCE_DASHBOARD.html'}")

def main():
    """Main entry point"""
    monitor = PerformanceMonitor()
    monitor.run()

if __name__ == '__main__':
    main()
