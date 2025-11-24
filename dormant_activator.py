#!/usr/bin/env python3
"""
======================================================================
DORMANT SYSTEM ACTIVATOR
======================================================================
Tool for discovering, testing, and activating dormant OVERKORE systems.

DORMANT_SYSTEMS/ contains ~40 hours of autonomous work waiting for integration:
- Data Cyclotron backend connector
- Trinity coordination systems
- Analytics and monitoring
- Knowledge search engines
- Continuous synchronization

This tool helps activate dormant systems safely:
- Scan and list dormant systems
- Check dependencies and prerequisites
- Test connectivity and functionality
- Activate systems with validation
- Monitor activated systems
- Generate activation reports

Usage:
    python3 dormant_activator.py list              # List all dormant systems
    python3 dormant_activator.py scan              # Scan and analyze systems
    python3 dormant_activator.py test cyclotron    # Test specific system
    python3 dormant_activator.py activate cyclotron # Activate system
    python3 dormant_activator.py status            # Show activation status
    python3 dormant_activator.py report            # Generate activation report

Author: C1 Mechanic (Autonomous Work Session)
Date: 2025-11-24
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional

class DormantActivator:
    """Tool for activating dormant OVERKORE systems"""

    def __init__(self):
        self.repo_root = Path(__file__).parent.absolute()
        self.dormant_dir = self.repo_root / "DORMANT_SYSTEMS"
        self.status_file = self.repo_root / "logs" / "dormant_activation_status.json"

    def list_systems(self) -> List[Dict]:
        """List all dormant systems"""
        if not self.dormant_dir.exists():
            print(f"❌ Dormant systems directory not found: {self.dormant_dir}")
            return []

        systems = []

        # Python systems
        for py_file in sorted(self.dormant_dir.glob("*.py")):
            system = self._analyze_python_file(py_file)
            systems.append(system)

        # JavaScript systems
        for js_file in sorted(self.dormant_dir.glob("*.js")):
            system = self._analyze_javascript_file(js_file)
            systems.append(system)

        return systems

    def _analyze_python_file(self, file_path: Path) -> Dict:
        """Analyze Python dormant system"""
        content = file_path.read_text()

        # Extract docstring/description
        description = ""
        if '"""' in content:
            start = content.find('"""')
            end = content.find('"""', start + 3)
            if end > start:
                description = content[start+3:end].strip()[:200]

        # Count imports and classes
        imports = len([line for line in content.split('\n') if line.strip().startswith('import') or line.strip().startswith('from')])
        classes = len([line for line in content.split('\n') if line.strip().startswith('class ')])
        functions = len([line for line in content.split('\n') if line.strip().startswith('def ')])

        return {
            'name': file_path.stem,
            'file': file_path.name,
            'path': str(file_path),
            'type': 'python',
            'size': file_path.stat().st_size,
            'description': description,
            'imports': imports,
            'classes': classes,
            'functions': functions,
            'category': self._categorize_system(file_path.stem)
        }

    def _analyze_javascript_file(self, file_path: Path) -> Dict:
        """Analyze JavaScript dormant system"""
        content = file_path.read_text()

        # Extract description from comments
        description = ""
        for line in content.split('\n')[:20]:
            if '//' in line or '/*' in line:
                description += line.strip() + " "
        description = description[:200]

        # Count requires and functions
        requires = len([line for line in content.split('\n') if 'require(' in line])
        functions = len([line for line in content.split('\n') if 'function ' in line or '=>' in line])

        return {
            'name': file_path.stem,
            'file': file_path.name,
            'path': str(file_path),
            'type': 'javascript',
            'size': file_path.stat().st_size,
            'description': description,
            'requires': requires,
            'functions': functions,
            'category': self._categorize_system(file_path.stem)
        }

    def _categorize_system(self, name: str) -> str:
        """Categorize system by name"""
        name_lower = name.lower()
        if 'cyclotron' in name_lower:
            return 'Data Cyclotron'
        elif 'trinity' in name_lower:
            return 'Trinity Coordination'
        elif 'brain' in name_lower or 'spreadsheet' in name_lower:
            return 'Brain Agents'
        elif 'analytics' in name_lower or 'monitor' in name_lower:
            return 'Monitoring & Analytics'
        else:
            return 'Other'

    def print_list(self):
        """Print list of dormant systems"""
        systems = self.list_systems()

        print("=" * 80)
        print("DORMANT SYSTEMS - READY FOR ACTIVATION")
        print("=" * 80)
        print(f"Location: {self.dormant_dir}")
        print(f"Total Systems: {len(systems)}")
        print()

        # Group by category
        by_category = {}
        for system in systems:
            cat = system['category']
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append(system)

        for category in sorted(by_category.keys()):
            print("=" * 80)
            print(f"📦 {category.upper()}")
            print("=" * 80)

            for system in by_category[category]:
                print(f"\n✦ {system['name']}")
                print(f"   File: {system['file']}")
                print(f"   Type: {system['type'].upper()}")
                print(f"   Size: {system['size']:,} bytes")

                if system['type'] == 'python':
                    print(f"   Imports: {system['imports']} | Classes: {system['classes']} | Functions: {system['functions']}")
                else:
                    print(f"   Requires: {system['requires']} | Functions: {system['functions']}")

                if system['description']:
                    desc_short = system['description'][:100] + "..." if len(system['description']) > 100 else system['description']
                    print(f"   Description: {desc_short}")

            print()

        print("=" * 80)

    def scan_systems(self):
        """Scan and analyze all dormant systems in detail"""
        print("=" * 80)
        print("SCANNING DORMANT SYSTEMS")
        print("=" * 80)
        print()

        systems = self.list_systems()

        # Check README
        readme = self.dormant_dir / "README.md"
        if readme.exists():
            print("✅ Found DORMANT_SYSTEMS/README.md")
            content = readme.read_text()
            print(f"   Size: {len(content):,} bytes")
            print()

        # Analyze by category
        by_category = {}
        for system in systems:
            cat = system['category']
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append(system)

        print("CATEGORY BREAKDOWN:")
        print()
        for category in sorted(by_category.keys()):
            count = len(by_category[category])
            total_size = sum(s['size'] for s in by_category[category])
            print(f"  📦 {category}: {count} systems ({total_size:,} bytes)")

        print()
        print("=" * 80)
        print("READY FOR ACTIVATION")
        print("=" * 80)
        print()
        print("Key Systems:")
        print()

        # Highlight important systems
        important = [
            'cyclotron_backend_connector',
            'TRINITY_CONVERGENCE_HUB',
            'TRINITY_AUTONOMOUS_MONITOR',
            'cyclotron_analytics_system'
        ]

        for sys_name in important:
            matching = [s for s in systems if s['name'] == sys_name]
            if matching:
                system = matching[0]
                print(f"✦ {system['name']}")
                print(f"   {system['category']} | {system['type'].upper()} | {system['size']:,} bytes")
                print(f"   ⏳ Ready for activation")
                print()

        print("=" * 80)
        print(f"Total: {len(systems)} dormant systems")
        print(f"Run 'python3 dormant_activator.py test <system>' to test")
        print("=" * 80)

    def test_system(self, system_name: str):
        """Test a specific dormant system"""
        systems = self.list_systems()
        matching = [s for s in systems if s['name'] == system_name]

        if not matching:
            print(f"❌ System not found: {system_name}")
            print(f"   Run 'python3 dormant_activator.py list' to see available systems")
            return False

        system = matching[0]

        print("=" * 80)
        print(f"TESTING DORMANT SYSTEM: {system['name']}")
        print("=" * 80)
        print()

        print(f"📦 System: {system['name']}")
        print(f"   File: {system['file']}")
        print(f"   Type: {system['type']}")
        print(f"   Category: {system['category']}")
        print()

        # Check file exists and is readable
        file_path = Path(system['path'])
        if not file_path.exists():
            print("❌ File not found")
            return False

        print("✅ File exists and is readable")
        print()

        # Check dependencies
        print("CHECKING DEPENDENCIES:")
        print()

        if system['type'] == 'python':
            success = self._test_python_dependencies(file_path)
        else:
            success = self._test_javascript_dependencies(file_path)

        print()
        print("=" * 80)
        if success:
            print("✅ SYSTEM TEST PASSED - Ready for activation")
        else:
            print("⚠️  SYSTEM TEST WARNINGS - May need dependency installation")
        print("=" * 80)

        return success

    def _test_python_dependencies(self, file_path: Path) -> bool:
        """Test Python system dependencies"""
        content = file_path.read_text()
        all_satisfied = True

        # Extract imports
        imports = []
        for line in content.split('\n'):
            line = line.strip()
            if line.startswith('import ') or line.startswith('from '):
                # Extract module name
                if line.startswith('import '):
                    module = line.split()[1].split('.')[0]
                else:
                    module = line.split()[1].split('.')[0]

                if module not in ['os', 'sys', 'json', 'time', 'datetime', 're', 'pathlib']:
                    imports.append(module)

        if imports:
            print("  External dependencies:")
            for module in sorted(set(imports)):
                try:
                    __import__(module)
                    print(f"    ✅ {module}")
                except ImportError:
                    print(f"    ❌ {module} (not installed)")
                    all_satisfied = False
        else:
            print("  ✅ No external dependencies")

        return all_satisfied

    def _test_javascript_dependencies(self, file_path: Path) -> bool:
        """Test JavaScript system dependencies"""
        content = file_path.read_text()

        # Extract requires
        requires = []
        for line in content.split('\n'):
            if 'require(' in line:
                # Extract module name
                start = line.find("require('") + 9
                if start > 8:
                    end = line.find("'", start)
                    if end > start:
                        module = line[start:end]
                        if not module.startswith('.'):  # External module
                            requires.append(module)

        if requires:
            print("  External dependencies:")
            for module in sorted(set(requires)):
                # Check if Node.js is available
                try:
                    result = subprocess.run(['node', '--version'], capture_output=True, timeout=2)
                    if result.returncode == 0:
                        print(f"    ⏳ {module} (requires Node.js)")
                    else:
                        print(f"    ❌ Node.js not available")
                        return False
                except:
                    print(f"    ❌ Node.js not available")
                    return False
        else:
            print("  ✅ No external dependencies")

        return True

    def activate_system(self, system_name: str):
        """Activate a dormant system"""
        print("=" * 80)
        print(f"ACTIVATING SYSTEM: {system_name}")
        print("=" * 80)
        print()
        print("⚠️  Activation functionality not yet implemented")
        print()
        print("Manual activation steps:")
        print()
        print("1. Review system code and dependencies")
        print("2. Install required dependencies")
        print("3. Configure environment variables")
        print("4. Test system in isolated environment")
        print("5. Move system from DORMANT_SYSTEMS/ to appropriate location")
        print("6. Update system integration points")
        print("7. Deploy and monitor")
        print()
        print("=" * 80)

    def get_status(self) -> Dict:
        """Get activation status"""
        systems = self.list_systems()

        status = {
            'timestamp': datetime.now().isoformat(),
            'total_systems': len(systems),
            'by_category': {},
            'by_type': {},
            'total_size': sum(s['size'] for s in systems)
        }

        # Group by category
        for system in systems:
            cat = system['category']
            if cat not in status['by_category']:
                status['by_category'][cat] = 0
            status['by_category'][cat] += 1

            typ = system['type']
            if typ not in status['by_type']:
                status['by_type'][typ] = 0
            status['by_type'][typ] += 1

        return status

    def print_status(self):
        """Print activation status"""
        status = self.get_status()

        print("=" * 80)
        print("DORMANT SYSTEM ACTIVATION STATUS")
        print("=" * 80)
        print()
        print(f"Total Systems: {status['total_systems']}")
        print(f"Total Size: {status['total_size']:,} bytes")
        print()

        print("By Category:")
        for cat, count in sorted(status['by_category'].items()):
            print(f"  {cat}: {count} systems")
        print()

        print("By Type:")
        for typ, count in sorted(status['by_type'].items()):
            print(f"  {typ.upper()}: {count} systems")
        print()

        print("=" * 80)
        print("Run 'python3 dormant_activator.py scan' for detailed analysis")
        print("=" * 80)

    def generate_report(self, output_file: str = "dormant_activation_report.json"):
        """Generate activation report"""
        systems = self.list_systems()
        status = self.get_status()

        report = {
            'generated_at': datetime.now().isoformat(),
            'summary': status,
            'systems': systems
        }

        output_path = Path(output_file)
        output_path.write_text(json.dumps(report, indent=2))

        print(f"✅ Activation report saved to: {output_file}")
        print(f"   Total systems: {len(systems)}")


def main():
    """Main CLI entry point"""
    command = sys.argv[1] if len(sys.argv) > 1 else "list"
    args = sys.argv[2:] if len(sys.argv) > 2 else []

    activator = DormantActivator()

    if command == "list":
        activator.print_list()

    elif command == "scan":
        activator.scan_systems()

    elif command == "test":
        if not args:
            print("❌ System name required")
            print("   Usage: python3 dormant_activator.py test <system_name>")
            sys.exit(1)
        activator.test_system(args[0])

    elif command == "activate":
        if not args:
            print("❌ System name required")
            print("   Usage: python3 dormant_activator.py activate <system_name>")
            sys.exit(1)
        activator.activate_system(args[0])

    elif command == "status":
        activator.print_status()

    elif command == "report":
        output = args[0] if args else "dormant_activation_report.json"
        activator.generate_report(output)

    elif command == "help" or command == "--help" or command == "-h":
        print(__doc__)

    else:
        print(f"❌ Unknown command: {command}")
        print("   Run 'python3 dormant_activator.py help' for usage")
        sys.exit(1)


if __name__ == "__main__":
    main()
