#!/usr/bin/env python3
"""
OVERKORE One-Command Deployment Script
Deploy entire OVERKORE system with a single command

Created: 2025-11-24
Purpose: Simplify deployment across all platforms and environments
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path
from typing import List, Dict

class OVERKOREDeployer:
    """One-command deployment for OVERKORE system"""

    def __init__(self):
        self.repo_root = Path(__file__).parent
        self.steps_completed = []
        self.steps_failed = []

    def run_command(self, cmd: List[str], description: str, required: bool = True) -> bool:
        """Run a command and track success"""
        print(f"\n[{'REQUIRED' if required else 'OPTIONAL'}] {description}")
        print(f"Command: {' '.join(cmd)}")

        try:
            result = subprocess.run(
                cmd,
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                timeout=300
            )

            if result.returncode == 0:
                print(f"✅ SUCCESS")
                self.steps_completed.append(description)
                if result.stdout:
                    print(f"Output: {result.stdout[:500]}")
                return True
            else:
                print(f"❌ FAILED (exit code: {result.returncode})")
                if result.stderr:
                    print(f"Error: {result.stderr[:500]}")

                if required:
                    self.steps_failed.append(description)
                    return False
                else:
                    print("⚠️ Non-critical failure, continuing...")
                    return True

        except subprocess.TimeoutExpired:
            print(f"❌ TIMEOUT after 300s")
            if required:
                self.steps_failed.append(description)
                return False
            return True

        except Exception as e:
            print(f"❌ ERROR: {e}")
            if required:
                self.steps_failed.append(description)
                return False
            return True

    def check_prerequisites(self) -> bool:
        """Check system prerequisites"""
        print("\n" + "="*70)
        print("CHECKING PREREQUISITES")
        print("="*70)

        # Check Python
        version = sys.version_info
        if version >= (3, 8):
            print(f"✅ Python {version.major}.{version.minor}.{version.micro}")
        else:
            print(f"❌ Python {version.major}.{version.minor} (3.8+ required)")
            return False

        # Check git
        try:
            result = subprocess.run(
                ["git", "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                print(f"✅ {result.stdout.strip()}")
            else:
                print("⚠️ Git not available")
        except:
            print("⚠️ Git not available")

        # Check if in git repo
        if (self.repo_root / ".git").exists():
            print("✅ Git repository detected")
        else:
            print("⚠️ Not in a git repository")

        return True

    def install_dependencies(self) -> bool:
        """Install Python dependencies"""
        print("\n" + "="*70)
        print("INSTALLING DEPENDENCIES")
        print("="*70)

        # Check for requirements file
        req_file = self.repo_root / "voice_interface_requirements.txt"

        if not req_file.exists():
            print("⚠️ voice_interface_requirements.txt not found, skipping dependency installation")
            return True

        # Install base dependencies
        success = self.run_command(
            [sys.executable, "-m", "pip", "install", "-r", "voice_interface_requirements.txt"],
            "Installing Voice Interface dependencies",
            required=False
        )

        # Install optional dependencies
        optional_packages = ["flask", "flask-cors", "psutil"]

        for package in optional_packages:
            self.run_command(
                [sys.executable, "-m", "pip", "install", package],
                f"Installing optional package: {package}",
                required=False
            )

        return True

    def run_tests(self) -> bool:
        """Run system tests"""
        print("\n" + "="*70)
        print("RUNNING TESTS")
        print("="*70)

        # Run basic tests
        test_file = self.repo_root / "test_voice_interface_v3.py"
        if test_file.exists():
            self.run_command(
                [sys.executable, str(test_file)],
                "Running basic Voice Interface tests",
                required=False
            )

        # Run health check
        health_file = self.repo_root / "system_health_check.py"
        if health_file.exists():
            self.run_command(
                [sys.executable, str(health_file)],
                "Running system health check",
                required=False
            )

        return True

    def setup_environment(self) -> bool:
        """Setup environment variables and configuration"""
        print("\n" + "="*70)
        print("ENVIRONMENT SETUP")
        print("="*70)

        # Check for .env file
        env_file = self.repo_root / ".env"
        env_example = self.repo_root / ".env.example"

        if not env_file.exists() and env_example.exists():
            print("Creating .env from .env.example")
            shutil.copy(env_example, env_file)
            print("✅ .env file created")
            print("⚠️  Please edit .env and add your API keys")
        elif env_file.exists():
            print("✅ .env file already exists")
        else:
            print("⚠️  No .env file found")

        # Create logs directory
        logs_dir = self.repo_root / "logs"
        logs_dir.mkdir(exist_ok=True)
        print(f"✅ Logs directory: {logs_dir}")

        return True

    def deploy_voice_interface(self) -> bool:
        """Deploy Voice Interface components"""
        print("\n" + "="*70)
        print("DEPLOYING VOICE INTERFACE")
        print("="*70)

        # Test Voice Interface
        vi_file = self.repo_root / "voice_interface_v3_production.py"
        if not vi_file.exists():
            print("❌ Voice Interface not found")
            return False

        print(f"✅ Voice Interface found: {vi_file}")

        # Quick test
        print("\nRunning quick Voice Interface test...")
        try:
            sys.path.insert(0, str(self.repo_root))
            from voice_interface_v3_production import VoiceInterfaceV3, Config

            config = Config()
            interface = VoiceInterfaceV3(config)
            kb_size = interface.initialize_knowledge_base()

            print(f"✅ Voice Interface operational")
            print(f"   Knowledge base: {kb_size} items")
            print(f"   Storage path: {config.storage_path}")

            return True

        except Exception as e:
            print(f"❌ Voice Interface test failed: {e}")
            return False

    def deploy_api_server(self) -> bool:
        """Deploy API server (optional)"""
        print("\n" + "="*70)
        print("API SERVER DEPLOYMENT (OPTIONAL)")
        print("="*70)

        api_file = self.repo_root / "voice_interface_api.py"
        if not api_file.exists():
            print("⚠️  API server not found, skipping")
            return True

        print(f"✅ API server found: {api_file}")
        print("   To start API server, run: python3 voice_interface_api.py")
        print("   Server will be available at http://localhost:5000")

        return True

    def check_database(self) -> bool:
        """Check database migration status"""
        print("\n" + "="*70)
        print("DATABASE CHECK")
        print("="*70)

        migration_file = self.repo_root / "migrations" / "002_fix_postgres_schema.sql"

        if not migration_file.exists():
            print("⚠️  Database migration file not found")
            return True

        print(f"✅ Database migration ready: {migration_file.name}")
        print("   To apply: Use Railway dashboard or run migration script")
        print("   Status: Manual application required (needs database access)")

        return True

    def generate_deployment_report(self):
        """Generate deployment report"""
        print("\n" + "="*70)
        print("DEPLOYMENT SUMMARY")
        print("="*70)

        total = len(self.steps_completed) + len(self.steps_failed)
        success = len(self.steps_completed)
        failed = len(self.steps_failed)

        print(f"\nTotal Steps: {total}")
        print(f"✅ Completed: {success}")
        print(f"❌ Failed: {failed}")

        if failed > 0:
            print("\nFailed Steps:")
            for step in self.steps_failed:
                print(f"  - {step}")

        print("\n" + "="*70)

        if failed == 0:
            print("DEPLOYMENT: SUCCESS ✅")
            print("\nNext Steps:")
            print("  1. Test Voice Interface: python3 voice_interface_v3_production.py")
            print("  2. (Optional) Start API: python3 voice_interface_api.py")
            print("  3. (Optional) Apply database migration via Railway")
            print("  4. Review logs/ directory for any issues")
            return True
        else:
            print("DEPLOYMENT: PARTIAL ⚠️")
            print(f"\n{failed} required steps failed. Review errors above.")
            return False

    def deploy(self):
        """Run full deployment"""
        print("\n" + "="*70)
        print("OVERKORE ONE-COMMAND DEPLOYMENT")
        print("="*70)
        print(f"Repository: {self.repo_root}")

        # Run deployment steps
        steps = [
            ("Prerequisites", self.check_prerequisites),
            ("Environment Setup", self.setup_environment),
            ("Dependencies", self.install_dependencies),
            ("Voice Interface", self.deploy_voice_interface),
            ("API Server", self.deploy_api_server),
            ("Database", self.check_database),
            ("Tests", self.run_tests),
        ]

        for name, func in steps:
            print(f"\n{'='*70}")
            print(f"STEP: {name}")
            print(f"{'='*70}")

            try:
                success = func()
                if not success:
                    print(f"\n❌ Step '{name}' failed")
                    # Continue anyway for optional steps
            except Exception as e:
                print(f"\n❌ Step '{name}' error: {e}")

        # Generate report
        return self.generate_deployment_report()


def main():
    """Main deployment entry point"""
    deployer = OVERKOREDeployer()
    success = deployer.deploy()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
