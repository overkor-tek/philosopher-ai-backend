#!/usr/bin/env python3
"""
API DOCUMENTATION GENERATOR
Automatically generates beautiful, interactive API documentation
by scanning backend code and extracting endpoints, parameters, and examples.
"""

import re
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional

class APIDocumentationGenerator:
    """
    Scans backend code and generates comprehensive API documentation.
    Outputs: HTML (interactive), Markdown (GitHub), JSON (OpenAPI)
    """

    def __init__(self, backend_path: str):
        self.backend_path = Path(backend_path)
        self.endpoints = []
        self.grouped_endpoints = {}

    def scan_express_server(self, server_file: Path) -> List[Dict[str, Any]]:
        """
        Scan Express.js server.js file and extract all API endpoints.
        """
        print(f"Scanning: {server_file}")

        with open(server_file, 'r', encoding='utf-8') as f:
            content = f.read()

        endpoints = []

        # Pattern to match Express routes: app.get('/path', ...)
        # Matches: app.METHOD('/path', middleware, handler)
        route_pattern = r"(?:app|router)\.(get|post|put|patch|delete|all)\s*\(\s*['\"]([^'\"]+)['\"]"

        for match in re.finditer(route_pattern, content, re.IGNORECASE):
            method = match.group(1).upper()
            path = match.group(2)

            # Find the handler function body
            handler_start = match.end()
            handler_body = self._extract_handler_body(content, handler_start)

            # Parse endpoint details
            endpoint = {
                'method': method,
                'path': path,
                'group': self._determine_group(path),
                'description': self._extract_description(handler_body),
                'auth_required': self._check_auth_required(content, match.start(), handler_body),
                'rate_limited': self._check_rate_limited(content, match.start()),
                'request_body': self._extract_request_body(handler_body),
                'query_params': self._extract_query_params(handler_body),
                'path_params': self._extract_path_params(path),
                'response': self._extract_response(handler_body),
                'example_request': self._generate_example_request(method, path),
                'example_response': self._generate_example_response(handler_body)
            }

            endpoints.append(endpoint)

        print(f"Found {len(endpoints)} endpoints")
        return endpoints

    def _extract_handler_body(self, content: str, start_pos: int, max_chars: int = 2000) -> str:
        """Extract the handler function body (next 2000 chars from match)"""
        return content[start_pos:start_pos + max_chars]

    def _determine_group(self, path: str) -> str:
        """Determine API group from path"""
        if '/auth' in path:
            return 'Authentication'
        elif '/workspace' in path:
            return 'Workspace Chat'
        elif '/questions' in path or '/usage' in path:
            return 'Philosopher AI'
        elif '/nav' in path:
            return 'Navigation'
        elif '/stripe' in path or '/subscriptions' in path:
            return 'Payment & Subscriptions'
        elif '/knowledge' in path or '/metrics' in path:
            return 'Knowledge Base'
        elif '/satellites' in path:
            return 'Satellite API'
        elif '/health' in path:
            return 'Health & Status'
        else:
            return 'Other'

    def _extract_description(self, handler_body: str) -> str:
        """Extract endpoint description from comments or infer from code"""
        # Look for comments before the handler
        comment_match = re.search(r'//\s*(.+)', handler_body)
        if comment_match:
            return comment_match.group(1).strip()

        # Look for route description in JSDoc
        jsdoc_match = re.search(r'/\*\*\s*\n\s*\*\s*(.+)', handler_body)
        if jsdoc_match:
            return jsdoc_match.group(1).strip()

        # Infer from code (e.g., "Create user account")
        return "API endpoint"

    def _check_auth_required(self, content: str, match_pos: int, handler_body: str) -> bool:
        """Check if endpoint requires authentication"""
        # Look for authenticateToken middleware
        route_line = content[max(0, match_pos - 200):match_pos + 200]
        if 'authenticateToken' in route_line or 'authenticateToken' in handler_body:
            return True

        # Check if req.user is accessed (implies auth)
        if 'req.user' in handler_body:
            return True

        return False

    def _check_rate_limited(self, content: str, match_pos: int) -> bool:
        """Check if endpoint has rate limiting"""
        route_line = content[max(0, match_pos - 200):match_pos + 200]
        return 'limiter' in route_line.lower()

    def _extract_request_body(self, handler_body: str) -> Dict[str, Any]:
        """Extract expected request body fields"""
        body_fields = {}

        # Pattern: req.body.fieldName
        body_pattern = r'req\.body\.(\w+)'
        for match in re.finditer(body_pattern, handler_body):
            field_name = match.group(1)
            body_fields[field_name] = {
                'type': 'string',  # Default, could be enhanced
                'required': True if 'required' in handler_body else False
            }

        return body_fields

    def _extract_query_params(self, handler_body: str) -> Dict[str, Any]:
        """Extract query parameters"""
        query_params = {}

        # Pattern: req.query.paramName
        query_pattern = r'req\.query\.(\w+)'
        for match in re.finditer(query_pattern, handler_body):
            param_name = match.group(1)
            query_params[param_name] = {
                'type': 'string',
                'required': False
            }

        return query_params

    def _extract_path_params(self, path: str) -> Dict[str, Any]:
        """Extract path parameters from route"""
        path_params = {}

        # Pattern: /api/:paramName
        param_pattern = r':(\w+)'
        for match in re.finditer(param_pattern, path):
            param_name = match.group(1)
            path_params[param_name] = {
                'type': 'string',
                'required': True
            }

        return path_params

    def _extract_response(self, handler_body: str) -> Dict[str, Any]:
        """Extract response structure"""
        response = {
            'status_codes': [],
            'body': {}
        }

        # Extract status codes
        status_pattern = r'res\.status\((\d+)\)'
        for match in re.finditer(status_pattern, handler_body):
            status_code = int(match.group(1))
            if status_code not in response['status_codes']:
                response['status_codes'].append(status_code)

        # Default status code if none found
        if not response['status_codes']:
            response['status_codes'] = [200]

        # Extract response fields (res.json({ field: value }))
        json_pattern = r'res\.json\(\s*\{([^}]+)\}'
        json_match = re.search(json_pattern, handler_body)
        if json_match:
            # Parse response fields
            fields_str = json_match.group(1)
            field_pattern = r'(\w+):'
            for match in re.finditer(field_pattern, fields_str):
                field_name = match.group(1)
                response['body'][field_name] = 'any'

        return response

    def _generate_example_request(self, method: str, path: str) -> str:
        """Generate example curl request"""
        base_url = "http://localhost:3002"
        full_url = f"{base_url}{path}"

        # Replace path params with example values
        full_url = re.sub(r':(\w+)', r'<\1>', full_url)

        if method == 'GET':
            return f"curl -X GET {full_url}"
        elif method in ['POST', 'PUT', 'PATCH']:
            return f"""curl -X {method} {full_url} \\
  -H "Content-Type: application/json" \\
  -d '{{"key": "value"}}'"""
        else:
            return f"curl -X {method} {full_url}"

    def _generate_example_response(self, handler_body: str) -> str:
        """Generate example response"""
        # Look for res.json() calls
        json_match = re.search(r'res\.json\(\s*(\{[^}]+\})', handler_body)
        if json_match:
            try:
                # Try to extract JSON structure
                return json_match.group(1)
            except:
                pass

        return '{"success": true, "data": {}}'

    def generate_html_documentation(self, output_path: Path):
        """Generate beautiful interactive HTML documentation"""
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Documentation - Philosopher AI Backend</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            line-height: 1.6;
        }}

        .container {{
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }}

        .header {{
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-bottom: 30px;
            text-align: center;
        }}

        .header h1 {{
            font-size: 36px;
            color: #667eea;
            margin-bottom: 10px;
        }}

        .header p {{
            color: #666;
            font-size: 18px;
        }}

        .stats {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}

        .stat-card {{
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            text-align: center;
        }}

        .stat-card h3 {{
            font-size: 32px;
            color: #667eea;
            margin-bottom: 5px;
        }}

        .stat-card p {{
            color: #666;
            font-size: 14px;
        }}

        .sidebar {{
            position: fixed;
            left: 0;
            top: 0;
            width: 250px;
            height: 100vh;
            background: white;
            padding: 20px;
            overflow-y: auto;
            box-shadow: 2px 0 10px rgba(0,0,0,0.1);
        }}

        .sidebar h2 {{
            font-size: 18px;
            margin-bottom: 20px;
            color: #667eea;
        }}

        .sidebar-group {{
            margin-bottom: 20px;
        }}

        .sidebar-group h3 {{
            font-size: 14px;
            color: #333;
            margin-bottom: 10px;
            font-weight: 600;
        }}

        .sidebar-link {{
            display: block;
            padding: 8px 10px;
            color: #666;
            text-decoration: none;
            border-radius: 5px;
            font-size: 13px;
            margin-bottom: 5px;
            transition: all 0.2s;
        }}

        .sidebar-link:hover {{
            background: #f0f0f0;
            color: #667eea;
        }}

        .content {{
            margin-left: 270px;
        }}

        .endpoint {{
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }}

        .endpoint-header {{
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f0f0f0;
        }}

        .method {{
            padding: 8px 16px;
            border-radius: 5px;
            font-weight: bold;
            font-size: 14px;
            margin-right: 15px;
        }}

        .method.GET {{ background: #61affe; color: white; }}
        .method.POST {{ background: #49cc90; color: white; }}
        .method.PUT {{ background: #fca130; color: white; }}
        .method.PATCH {{ background: #50e3c2; color: white; }}
        .method.DELETE {{ background: #f93e3e; color: white; }}

        .endpoint-path {{
            font-size: 18px;
            font-weight: 600;
            color: #333;
            font-family: 'Courier New', monospace;
        }}

        .badges {{
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }}

        .badge {{
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }}

        .badge.auth {{
            background: #ffe0b2;
            color: #e65100;
        }}

        .badge.rate {{
            background: #f3e5f5;
            color: #4a148c;
        }}

        .section {{
            margin-bottom: 25px;
        }}

        .section h3 {{
            font-size: 16px;
            color: #667eea;
            margin-bottom: 10px;
        }}

        .param-table {{
            width: 100%;
            border-collapse: collapse;
        }}

        .param-table th {{
            background: #f8f9fa;
            padding: 12px;
            text-align: left;
            font-size: 13px;
            color: #666;
            font-weight: 600;
        }}

        .param-table td {{
            padding: 12px;
            border-bottom: 1px solid #f0f0f0;
            font-size: 13px;
        }}

        .code-block {{
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 20px;
            border-radius: 5px;
            overflow-x: auto;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.6;
        }}

        .response-status {{
            display: inline-block;
            padding: 4px 8px;
            background: #e8f5e9;
            color: #2e7d32;
            border-radius: 3px;
            font-size: 12px;
            font-weight: 600;
            margin-right: 5px;
        }}

        @media (max-width: 768px) {{
            .sidebar {{
                display: none;
            }}

            .content {{
                margin-left: 0;
            }}
        }}
    </style>
</head>
<body>
    <div class="sidebar">
        <h2>📚 API Reference</h2>
        {self._generate_sidebar_html()}
    </div>

    <div class="content">
        <div class="container">
            <div class="header">
                <h1>🚀 Philosopher AI Backend</h1>
                <p>Complete API Documentation</p>
                <p style="font-size: 14px; color: #999; margin-top: 10px;">
                    Generated {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
                </p>
            </div>

            <div class="stats">
                <div class="stat-card">
                    <h3>{len(self.endpoints)}</h3>
                    <p>Total Endpoints</p>
                </div>
                <div class="stat-card">
                    <h3>{len(self.grouped_endpoints)}</h3>
                    <p>API Groups</p>
                </div>
                <div class="stat-card">
                    <h3>{sum(1 for e in self.endpoints if e['auth_required'])}</h3>
                    <p>Protected Routes</p>
                </div>
                <div class="stat-card">
                    <h3>v1</h3>
                    <p>API Version</p>
                </div>
            </div>

            {self._generate_endpoints_html()}
        </div>
    </div>
</body>
</html>"""

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html)

        print(f"HTML documentation saved to: {output_path}")

    def _generate_sidebar_html(self) -> str:
        """Generate sidebar navigation HTML"""
        html = ""

        for group, endpoints in self.grouped_endpoints.items():
            html += f'<div class="sidebar-group">\n'
            html += f'<h3>{group}</h3>\n'

            for endpoint in endpoints:
                endpoint_id = f"{endpoint['method']}_{endpoint['path']}".replace('/', '_').replace(':', '')
                html += f'<a href="#{endpoint_id}" class="sidebar-link">{endpoint["method"]} {endpoint["path"]}</a>\n'

            html += '</div>\n'

        return html

    def _generate_endpoints_html(self) -> str:
        """Generate endpoints documentation HTML"""
        html = ""

        for group, endpoints in self.grouped_endpoints.items():
            html += f'<h2 style="color: #667eea; margin: 40px 0 20px 0;">{group}</h2>\n'

            for endpoint in endpoints:
                endpoint_id = f"{endpoint['method']}_{endpoint['path']}".replace('/', '_').replace(':', '')

                html += f'<div class="endpoint" id="{endpoint_id}">\n'
                html += f'<div class="endpoint-header">\n'
                html += f'<span class="method {endpoint["method"]}">{endpoint["method"]}</span>\n'
                html += f'<span class="endpoint-path">{endpoint["path"]}</span>\n'
                html += f'</div>\n'

                # Badges
                if endpoint['auth_required'] or endpoint['rate_limited']:
                    html += '<div class="badges">\n'
                    if endpoint['auth_required']:
                        html += '<span class="badge auth">🔒 Auth Required</span>\n'
                    if endpoint['rate_limited']:
                        html += '<span class="badge rate">⏱️ Rate Limited</span>\n'
                    html += '</div>\n'

                html += f'<p style="color: #666; margin-bottom: 20px;">{endpoint["description"]}</p>\n'

                # Path Parameters
                if endpoint['path_params']:
                    html += '<div class="section">\n'
                    html += '<h3>Path Parameters</h3>\n'
                    html += '<table class="param-table">\n'
                    html += '<tr><th>Name</th><th>Type</th><th>Required</th></tr>\n'
                    for param, details in endpoint['path_params'].items():
                        html += f'<tr><td><code>{param}</code></td><td>{details["type"]}</td><td>{"Yes" if details["required"] else "No"}</td></tr>\n'
                    html += '</table>\n'
                    html += '</div>\n'

                # Query Parameters
                if endpoint['query_params']:
                    html += '<div class="section">\n'
                    html += '<h3>Query Parameters</h3>\n'
                    html += '<table class="param-table">\n'
                    html += '<tr><th>Name</th><th>Type</th><th>Required</th></tr>\n'
                    for param, details in endpoint['query_params'].items():
                        html += f'<tr><td><code>{param}</code></td><td>{details["type"]}</td><td>{"Yes" if details["required"] else "No"}</td></tr>\n'
                    html += '</table>\n'
                    html += '</div>\n'

                # Request Body
                if endpoint['request_body']:
                    html += '<div class="section">\n'
                    html += '<h3>Request Body</h3>\n'
                    html += '<table class="param-table">\n'
                    html += '<tr><th>Field</th><th>Type</th><th>Required</th></tr>\n'
                    for field, details in endpoint['request_body'].items():
                        html += f'<tr><td><code>{field}</code></td><td>{details["type"]}</td><td>{"Yes" if details["required"] else "No"}</td></tr>\n'
                    html += '</table>\n'
                    html += '</div>\n'

                # Response
                html += '<div class="section">\n'
                html += '<h3>Response</h3>\n'
                for status in endpoint['response']['status_codes']:
                    html += f'<span class="response-status">{status}</span>\n'
                html += f'<pre class="code-block">{endpoint["example_response"]}</pre>\n'
                html += '</div>\n'

                # Example Request
                html += '<div class="section">\n'
                html += '<h3>Example Request</h3>\n'
                html += f'<pre class="code-block">{endpoint["example_request"]}</pre>\n'
                html += '</div>\n'

                html += '</div>\n'

        return html

    def generate_markdown_documentation(self, output_path: Path):
        """Generate Markdown documentation for GitHub"""
        md = f"""# API Documentation - Philosopher AI Backend
**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

---

## Overview

**Base URL:** `http://localhost:3002`
**API Version:** v1
**Total Endpoints:** {len(self.endpoints)}

---

## Table of Contents

"""

        # Table of contents
        for group in self.grouped_endpoints.keys():
            md += f"- [{group}](#{group.lower().replace(' ', '-').replace('&', '')})\n"

        md += "\n---\n\n"

        # Endpoints
        for group, endpoints in self.grouped_endpoints.items():
            md += f"## {group}\n\n"

            for endpoint in endpoints:
                md += f"### `{endpoint['method']} {endpoint['path']}`\n\n"
                md += f"{endpoint['description']}\n\n"

                # Badges
                badges = []
                if endpoint['auth_required']:
                    badges.append("🔒 Auth Required")
                if endpoint['rate_limited']:
                    badges.append("⏱️ Rate Limited")

                if badges:
                    md += f"**{' | '.join(badges)}**\n\n"

                # Parameters
                if endpoint['path_params']:
                    md += "**Path Parameters:**\n\n"
                    md += "| Name | Type | Required |\n"
                    md += "|------|------|----------|\n"
                    for param, details in endpoint['path_params'].items():
                        md += f"| `{param}` | {details['type']} | {'Yes' if details['required'] else 'No'} |\n"
                    md += "\n"

                if endpoint['query_params']:
                    md += "**Query Parameters:**\n\n"
                    md += "| Name | Type | Required |\n"
                    md += "|------|------|----------|\n"
                    for param, details in endpoint['query_params'].items():
                        md += f"| `{param}` | {details['type']} | {'Yes' if details['required'] else 'No'} |\n"
                    md += "\n"

                if endpoint['request_body']:
                    md += "**Request Body:**\n\n"
                    md += "| Field | Type | Required |\n"
                    md += "|-------|------|----------|\n"
                    for field, details in endpoint['request_body'].items():
                        md += f"| `{field}` | {details['type']} | {'Yes' if details['required'] else 'No'} |\n"
                    md += "\n"

                # Response
                md += "**Response:**\n\n"
                md += f"Status: {', '.join(map(str, endpoint['response']['status_codes']))}\n\n"
                md += "```json\n"
                md += endpoint['example_response']
                md += "\n```\n\n"

                # Example
                md += "**Example Request:**\n\n"
                md += "```bash\n"
                md += endpoint['example_request']
                md += "\n```\n\n"

                md += "---\n\n"

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(md)

        print(f"Markdown documentation saved to: {output_path}")

    def run(self):
        """Main execution: scan code and generate all documentation"""
        print("=" * 70)
        print("API DOCUMENTATION GENERATOR")
        print("=" * 70)

        # Find server.js
        server_file = self.backend_path / 'server.js'

        if not server_file.exists():
            print(f"ERROR: server.js not found at {server_file}")
            return

        # Scan endpoints
        self.endpoints = self.scan_express_server(server_file)

        # Group endpoints
        for endpoint in self.endpoints:
            group = endpoint['group']
            if group not in self.grouped_endpoints:
                self.grouped_endpoints[group] = []
            self.grouped_endpoints[group].append(endpoint)

        # Generate documentation
        output_dir = Path.home()

        print("\nGenerating documentation...")
        self.generate_html_documentation(output_dir / 'API_DOCUMENTATION.html')
        self.generate_markdown_documentation(output_dir / 'API_DOCUMENTATION.md')

        print("\n" + "=" * 70)
        print("DOCUMENTATION GENERATION COMPLETE")
        print("=" * 70)
        print(f"\nHTML: {output_dir / 'API_DOCUMENTATION.html'}")
        print(f"Markdown: {output_dir / 'API_DOCUMENTATION.md'}")
        print(f"\nTotal endpoints documented: {len(self.endpoints)}")
        print(f"API groups: {len(self.grouped_endpoints)}")
        print("\nOpen API_DOCUMENTATION.html in your browser to view!")

def main():
    """Main entry point"""
    backend_path = Path.home() / '100X_BACKUP' / '100X_DEPLOYMENT' / 'BACKEND' / 'philosopher-ai'

    generator = APIDocumentationGenerator(str(backend_path))
    generator.run()

if __name__ == '__main__':
    main()
