#!/usr/bin/env python3
"""
CODE QUALITY ANALYZER
Analyzes codebase for quality, security, complexity, and best practices.
Generates actionable suggestions for improvement.
"""

import re
import ast
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Tuple
from collections import defaultdict

class CodeQualityAnalyzer:
    """
    Analyzes code quality across:
    - Security vulnerabilities
    - Code complexity
    - Best practices violations
    - Code smells
    - Documentation coverage
    - Maintainability
    """

    def __init__(self, codebase_path: Path):
        self.codebase_path = codebase_path
        self.issues = []
        self.metrics = {
            'total_files': 0,
            'total_lines': 0,
            'total_issues': 0,
            'security_issues': 0,
            'complexity_issues': 0,
            'style_issues': 0,
            'documentation_score': 0,
            'maintainability_score': 0,
            'overall_score': 0
        }
        self.file_scores = {}

    def analyze_codebase(self):
        """Analyze entire codebase"""
        print("\nAnalyzing codebase...")

        # Find all source files
        js_files = list(self.codebase_path.glob('**/*.js'))
        py_files = list(self.codebase_path.glob('**/*.py'))

        all_files = js_files + py_files
        self.metrics['total_files'] = len(all_files)

        print(f"Found {len(js_files)} JavaScript files")
        print(f"Found {len(py_files)} Python files")

        # Analyze each file
        for file_path in all_files:
            if self._should_skip(file_path):
                continue

            print(f"  Analyzing: {file_path.relative_to(self.codebase_path)}")

            if file_path.suffix == '.js':
                self._analyze_javascript(file_path)
            elif file_path.suffix == '.py':
                self._analyze_python(file_path)

    def _should_skip(self, file_path: Path) -> bool:
        """Check if file should be skipped"""
        skip_patterns = [
            'node_modules',
            '.git',
            'dist',
            'build',
            '__pycache__',
            '.venv',
            'venv',
            'test',
            'tests',
            '.min.js'
        ]

        path_str = str(file_path)
        return any(pattern in path_str for pattern in skip_patterns)

    def _analyze_javascript(self, file_path: Path):
        """Analyze JavaScript file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.split('\n')

            self.metrics['total_lines'] += len(lines)
            file_issues = []

            # Security checks
            file_issues.extend(self._check_js_security(content, file_path))

            # Complexity checks
            file_issues.extend(self._check_js_complexity(content, file_path))

            # Best practices
            file_issues.extend(self._check_js_best_practices(content, file_path))

            # Documentation
            doc_score = self._check_js_documentation(content)

            # Calculate file score
            file_score = 100 - (len(file_issues) * 5)
            file_score = max(0, min(100, file_score))

            self.file_scores[str(file_path)] = {
                'score': file_score,
                'issues': len(file_issues),
                'lines': len(lines),
                'doc_score': doc_score
            }

            self.issues.extend(file_issues)

        except Exception as e:
            print(f"    ⚠️  Could not analyze {file_path}: {e}")

    def _check_js_security(self, content: str, file_path: Path) -> List[Dict]:
        """Check JavaScript for security issues"""
        issues = []

        # SQL Injection
        if re.search(r'query\s*\([^)]*\+[^)]*\)', content, re.IGNORECASE):
            issues.append({
                'file': str(file_path),
                'category': 'Security',
                'severity': 'HIGH',
                'type': 'SQL Injection Risk',
                'message': 'Possible SQL injection: String concatenation in query',
                'suggestion': 'Use parameterized queries instead'
            })
            self.metrics['security_issues'] += 1

        # eval() usage
        if re.search(r'\beval\s*\(', content):
            issues.append({
                'file': str(file_path),
                'category': 'Security',
                'severity': 'HIGH',
                'type': 'Dangerous eval()',
                'message': 'Use of eval() detected - security risk',
                'suggestion': 'Avoid eval(), use JSON.parse() or alternative'
            })
            self.metrics['security_issues'] += 1

        # console.log in production
        if re.search(r'console\.(log|error|warn)', content):
            issues.append({
                'file': str(file_path),
                'category': 'Security',
                'severity': 'LOW',
                'type': 'Information Disclosure',
                'message': 'console.log() may expose sensitive information',
                'suggestion': 'Remove console statements in production'
            })
            self.metrics['security_issues'] += 1

        # Hardcoded secrets
        if re.search(r'(password|secret|api[_-]?key|token)\s*[:=]\s*["\'][^"\']{8,}', content, re.IGNORECASE):
            issues.append({
                'file': str(file_path),
                'category': 'Security',
                'severity': 'CRITICAL',
                'type': 'Hardcoded Credentials',
                'message': 'Possible hardcoded secret detected',
                'suggestion': 'Use environment variables for secrets'
            })
            self.metrics['security_issues'] += 1

        return issues

    def _check_js_complexity(self, content: str, file_path: Path) -> List[Dict]:
        """Check JavaScript complexity"""
        issues = []

        # Long functions (>50 lines)
        function_pattern = r'(function\s+\w+\s*\([^)]*\)\s*\{|const\s+\w+\s*=\s*\([^)]*\)\s*=>)'
        functions = list(re.finditer(function_pattern, content))

        for match in functions:
            start = match.start()
            # Estimate function length (simplified)
            next_function = content.find('function', start + 1)
            next_const = content.find('const', start + 1)
            end = min(next_function if next_function > 0 else len(content),
                     next_const if next_const > 0 else len(content))

            function_body = content[start:end]
            lines = len(function_body.split('\n'))

            if lines > 50:
                issues.append({
                    'file': str(file_path),
                    'category': 'Complexity',
                    'severity': 'MEDIUM',
                    'type': 'Long Function',
                    'message': f'Function is {lines} lines long (>50 is complex)',
                    'suggestion': 'Break down into smaller functions'
                })
                self.metrics['complexity_issues'] += 1

        # Deeply nested code (>4 levels)
        max_nesting = self._count_max_nesting(content)
        if max_nesting > 4:
            issues.append({
                'file': str(file_path),
                'category': 'Complexity',
                'severity': 'MEDIUM',
                'type': 'Deep Nesting',
                'message': f'Max nesting level: {max_nesting} (>4 is complex)',
                'suggestion': 'Refactor to reduce nesting (early returns, guards)'
            })
            self.metrics['complexity_issues'] += 1

        return issues

    def _count_max_nesting(self, content: str) -> int:
        """Count maximum nesting level"""
        max_level = 0
        current_level = 0

        for char in content:
            if char == '{':
                current_level += 1
                max_level = max(max_level, current_level)
            elif char == '}':
                current_level -= 1

        return max_level

    def _check_js_best_practices(self, content: str, file_path: Path) -> List[Dict]:
        """Check JavaScript best practices"""
        issues = []

        # var instead of let/const
        if re.search(r'\bvar\s+\w+', content):
            issues.append({
                'file': str(file_path),
                'category': 'Style',
                'severity': 'LOW',
                'type': 'Use of var',
                'message': 'Use let or const instead of var',
                'suggestion': 'Replace var with const (or let if reassigned)'
            })
            self.metrics['style_issues'] += 1

        # Missing error handling
        if 'async' in content and 'try' not in content:
            issues.append({
                'file': str(file_path),
                'category': 'Best Practice',
                'severity': 'MEDIUM',
                'type': 'Missing Error Handling',
                'message': 'Async function without try/catch',
                'suggestion': 'Add try/catch for error handling'
            })

        # Magic numbers
        numbers = re.findall(r'\b\d{3,}\b', content)
        if len(numbers) > 3:
            issues.append({
                'file': str(file_path),
                'category': 'Style',
                'severity': 'LOW',
                'type': 'Magic Numbers',
                'message': f'Found {len(numbers)} magic numbers',
                'suggestion': 'Extract to named constants'
            })
            self.metrics['style_issues'] += 1

        return issues

    def _check_js_documentation(self, content: str) -> int:
        """Check JavaScript documentation coverage"""
        # Count functions
        functions = len(re.findall(r'(function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>)', content))

        # Count JSDoc comments
        jsdoc = len(re.findall(r'/\*\*[\s\S]*?\*/', content))

        if functions == 0:
            return 100

        coverage = (jsdoc / functions) * 100
        return min(100, coverage)

    def _analyze_python(self, file_path: Path):
        """Analyze Python file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.split('\n')

            self.metrics['total_lines'] += len(lines)
            file_issues = []

            # Security checks
            file_issues.extend(self._check_py_security(content, file_path))

            # Complexity checks
            file_issues.extend(self._check_py_complexity(content, file_path))

            # Best practices
            file_issues.extend(self._check_py_best_practices(content, file_path))

            # Documentation
            doc_score = self._check_py_documentation(content)

            # Calculate file score
            file_score = 100 - (len(file_issues) * 5)
            file_score = max(0, min(100, file_score))

            self.file_scores[str(file_path)] = {
                'score': file_score,
                'issues': len(file_issues),
                'lines': len(lines),
                'doc_score': doc_score
            }

            self.issues.extend(file_issues)

        except Exception as e:
            print(f"    ⚠️  Could not analyze {file_path}: {e}")

    def _check_py_security(self, content: str, file_path: Path) -> List[Dict]:
        """Check Python for security issues"""
        issues = []

        # eval() / exec()
        if re.search(r'\b(eval|exec)\s*\(', content):
            issues.append({
                'file': str(file_path),
                'category': 'Security',
                'severity': 'HIGH',
                'type': 'Dangerous eval/exec',
                'message': 'Use of eval() or exec() - security risk',
                'suggestion': 'Use ast.literal_eval() or alternative'
            })
            self.metrics['security_issues'] += 1

        # SQL Injection
        if re.search(r'(execute|cursor)\s*\([^)]*%s[^)]*%', content):
            issues.append({
                'file': str(file_path),
                'category': 'Security',
                'severity': 'HIGH',
                'type': 'SQL Injection Risk',
                'message': 'Possible SQL injection: String formatting in query',
                'suggestion': 'Use parameterized queries'
            })
            self.metrics['security_issues'] += 1

        # Hardcoded secrets
        if re.search(r'(password|secret|api[_-]?key|token)\s*=\s*["\'][^"\']{8,}', content, re.IGNORECASE):
            issues.append({
                'file': str(file_path),
                'category': 'Security',
                'severity': 'CRITICAL',
                'type': 'Hardcoded Credentials',
                'message': 'Possible hardcoded secret detected',
                'suggestion': 'Use environment variables for secrets'
            })
            self.metrics['security_issues'] += 1

        return issues

    def _check_py_complexity(self, content: str, file_path: Path) -> List[Dict]:
        """Check Python complexity"""
        issues = []

        # Long functions (>50 lines)
        function_pattern = r'def\s+\w+\s*\([^)]*\):'
        functions = list(re.finditer(function_pattern, content))

        for match in functions:
            start = match.start()
            # Find next function
            next_function = content.find('\ndef ', start + 1)
            end = next_function if next_function > 0 else len(content)

            function_body = content[start:end]
            lines = len(function_body.split('\n'))

            if lines > 50:
                issues.append({
                    'file': str(file_path),
                    'category': 'Complexity',
                    'severity': 'MEDIUM',
                    'type': 'Long Function',
                    'message': f'Function is {lines} lines long (>50 is complex)',
                    'suggestion': 'Break down into smaller functions'
                })
                self.metrics['complexity_issues'] += 1

        return issues

    def _check_py_best_practices(self, content: str, file_path: Path) -> List[Dict]:
        """Check Python best practices"""
        issues = []

        # Bare except
        if re.search(r'except\s*:', content):
            issues.append({
                'file': str(file_path),
                'category': 'Best Practice',
                'severity': 'MEDIUM',
                'type': 'Bare except',
                'message': 'Bare except clause catches all exceptions',
                'suggestion': 'Catch specific exceptions'
            })

        # print() statements (in production code)
        print_count = len(re.findall(r'\bprint\s*\(', content))
        if print_count > 5:
            issues.append({
                'file': str(file_path),
                'category': 'Style',
                'severity': 'LOW',
                'type': 'Excessive print()',
                'message': f'{print_count} print() statements found',
                'suggestion': 'Use logging module instead'
            })
            self.metrics['style_issues'] += 1

        return issues

    def _check_py_documentation(self, content: str) -> int:
        """Check Python documentation coverage"""
        # Count functions/classes
        functions = len(re.findall(r'(def\s+\w+|class\s+\w+)', content))

        # Count docstrings
        docstrings = len(re.findall(r'"""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\'', content))

        if functions == 0:
            return 100

        coverage = (docstrings / functions) * 100
        return min(100, coverage)

    def calculate_scores(self):
        """Calculate overall quality scores"""
        if not self.file_scores:
            return

        # Average file score
        avg_score = sum(f['score'] for f in self.file_scores.values()) / len(self.file_scores)

        # Documentation score
        doc_score = sum(f['doc_score'] for f in self.file_scores.values()) / len(self.file_scores)

        # Maintainability score (based on complexity and style)
        maintainability = 100 - (self.metrics['complexity_issues'] + self.metrics['style_issues'])
        maintainability = max(0, maintainability)

        self.metrics['documentation_score'] = round(doc_score, 1)
        self.metrics['maintainability_score'] = round(maintainability, 1)
        self.metrics['overall_score'] = round((avg_score + doc_score + maintainability) / 3, 1)
        self.metrics['total_issues'] = len(self.issues)

    def generate_html_report(self, output_path: Path):
        """Generate beautiful HTML quality report"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # Group issues by category
        by_category = defaultdict(list)
        for issue in self.issues:
            by_category[issue['category']].append(issue)

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Quality Report</title>
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

        .score-ring {{
            width: 150px;
            height: 150px;
            margin: 20px auto;
            border-radius: 50%;
            border: 15px solid #e0e0e0;
            border-top-color: {'#4caf50' if self.metrics['overall_score'] >= 80 else '#f39c12' if self.metrics['overall_score'] >= 60 else '#e74c3c'};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            font-weight: bold;
            color: #333;
        }}

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

        .issue-item {{
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 15px;
            border-left: 4px solid;
        }}

        .issue-item.critical {{ border-left-color: #e74c3c; }}
        .issue-item.high {{ border-left-color: #e67e22; }}
        .issue-item.medium {{ border-left-color: #f39c12; }}
        .issue-item.low {{ border-left-color: #95a5a6; }}

        .issue-header {{ display: flex; justify-content: space-between; margin-bottom: 10px; }}

        .badge {{
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            color: white;
        }}

        .badge.critical {{ background: #e74c3c; }}
        .badge.high {{ background: #e67e22; }}
        .badge.medium {{ background: #f39c12; }}
        .badge.low {{ background: #95a5a6; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Code Quality Report</h1>
            <p>Generated {timestamp}</p>
            <div class="score-ring">{self.metrics['overall_score']}</div>
            <p style="color: #666;">Overall Quality Score</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <h3>{self.metrics['total_files']}</h3>
                <p>Files Analyzed</p>
            </div>
            <div class="stat-card">
                <h3>{self.metrics['total_lines']:,}</h3>
                <p>Lines of Code</p>
            </div>
            <div class="stat-card">
                <h3>{self.metrics['security_issues']}</h3>
                <p>Security Issues</p>
            </div>
            <div class="stat-card">
                <h3>{self.metrics['documentation_score']:.0f}%</h3>
                <p>Documentation</p>
            </div>
        </div>

        <div class="section">
            <h2>🔒 Security Issues ({len(by_category['Security'])})</h2>
"""

        for issue in by_category['Security'][:20]:
            severity_class = issue['severity'].lower()
            html += f"""
            <div class="issue-item {severity_class}">
                <div class="issue-header">
                    <strong>{issue['type']}</strong>
                    <span class="badge {severity_class}">{issue['severity']}</span>
                </div>
                <p>{issue['message']}</p>
                <p style="margin-top: 10px; color: #666; font-size: 13px;">
                    💡 {issue['suggestion']}
                </p>
                <p style="margin-top: 5px; color: #999; font-size: 12px;">
                    📁 {Path(issue['file']).name}
                </p>
            </div>
"""

        html += f"""
        </div>

        <div class="section">
            <h2>🧩 Complexity Issues ({len(by_category['Complexity'])})</h2>
"""

        for issue in by_category['Complexity'][:20]:
            severity_class = issue['severity'].lower()
            html += f"""
            <div class="issue-item {severity_class}">
                <div class="issue-header">
                    <strong>{issue['type']}</strong>
                    <span class="badge {severity_class}">{issue['severity']}</span>
                </div>
                <p>{issue['message']}</p>
                <p style="margin-top: 10px; color: #666; font-size: 13px;">
                    💡 {issue['suggestion']}
                </p>
                <p style="margin-top: 5px; color: #999; font-size: 12px;">
                    📁 {Path(issue['file']).name}
                </p>
            </div>
"""

        html += """
        </div>
    </div>
</body>
</html>"""

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html)

        print(f"\nHTML report saved to: {output_path}")

    def run(self):
        """Main execution"""
        print("=" * 70)
        print("CODE QUALITY ANALYZER")
        print("=" * 70)
        print(f"Analyzing: {self.codebase_path}")

        self.analyze_codebase()
        self.calculate_scores()

        print("\n" + "=" * 70)
        print("ANALYSIS COMPLETE")
        print("=" * 70)
        print(f"Overall Score: {self.metrics['overall_score']}/100")
        print(f"Files Analyzed: {self.metrics['total_files']}")
        print(f"Total Issues: {self.metrics['total_issues']}")
        print(f"Security Issues: {self.metrics['security_issues']}")
        print(f"Documentation: {self.metrics['documentation_score']:.0f}%")

        # Generate report
        output_dir = Path.home()
        self.generate_html_report(output_dir / 'CODE_QUALITY_REPORT.html')

        print(f"\nReport: {output_dir / 'CODE_QUALITY_REPORT.html'}")

def main():
    """Main entry point"""
    backend_path = Path.home() / '100X_BACKUP' / '100X_DEPLOYMENT' / 'BACKEND' / 'philosopher-ai'

    analyzer = CodeQualityAnalyzer(backend_path)
    analyzer.run()

if __name__ == '__main__':
    main()
