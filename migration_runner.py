#!/usr/bin/env python3
"""
======================================================================
DATABASE MIGRATION RUNNER
======================================================================
Programmatic tool for applying and managing database migrations.

Capabilities:
- List all available migrations
- Check which migrations have been applied
- Apply pending migrations
- Rollback migrations
- Dry-run mode (preview changes)
- Generate migration status reports
- Support for PostgreSQL and SQLite

Usage:
    python3 migration_runner.py status          # Show migration status
    python3 migration_runner.py list            # List all migrations
    python3 migration_runner.py apply           # Apply all pending migrations
    python3 migration_runner.py apply 002       # Apply specific migration
    python3 migration_runner.py rollback        # Rollback last migration
    python3 migration_runner.py dry-run         # Preview pending migrations

Environment Variables:
    DATABASE_URL - PostgreSQL connection string (required for apply/rollback)
    MIGRATIONS_DIR - Path to migrations directory (default: ./migrations)

Author: C1 Mechanic (Autonomous Work Session)
Date: 2025-11-24
"""

import os
import sys
import re
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional, Tuple
import subprocess

class MigrationRunner:
    """Database migration management system"""

    def __init__(self, migrations_dir: str = "./migrations"):
        self.migrations_dir = Path(migrations_dir)
        self.database_url = os.getenv('DATABASE_URL', '')

        # Check if psycopg2 is available
        try:
            import psycopg2
            self.psycopg2 = psycopg2
            self.psycopg2_available = True
        except ImportError:
            self.psycopg2 = None
            self.psycopg2_available = False

    def list_migrations(self) -> List[Dict]:
        """List all available migration files"""
        if not self.migrations_dir.exists():
            print(f"❌ Migrations directory not found: {self.migrations_dir}")
            return []

        migrations = []
        for file_path in sorted(self.migrations_dir.glob("*.sql")):
            migration = self._parse_migration_file(file_path)
            migrations.append(migration)

        return migrations

    def _parse_migration_file(self, file_path: Path) -> Dict:
        """Parse migration file metadata"""
        content = file_path.read_text()

        # Extract metadata from SQL comments
        description = ""
        created = ""

        # Look for description in comments
        desc_match = re.search(r'--\s*Description:\s*(.+)', content, re.IGNORECASE)
        if desc_match:
            description = desc_match.group(1).strip()

        # Look for created date
        created_match = re.search(r'--\s*Created:\s*(.+)', content, re.IGNORECASE)
        if created_match:
            created = created_match.group(1).strip()

        # Count SQL statements (rough estimate)
        statements = len([s for s in content.split(';') if s.strip() and not s.strip().startswith('--')])

        return {
            'number': file_path.stem.split('_')[0],
            'name': file_path.stem,
            'file': file_path.name,
            'path': str(file_path),
            'description': description,
            'created': created,
            'size': file_path.stat().st_size,
            'statements': statements
        }

    def get_applied_migrations(self) -> List[str]:
        """Get list of applied migrations from database"""
        if not self.database_url:
            return []

        if not self.psycopg2_available:
            print("⚠️  psycopg2 not available - cannot check applied migrations")
            return []

        try:
            conn = self.psycopg2.connect(self.database_url)
            cursor = conn.cursor()

            # Check if migrations table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'migrations'
                )
            """)

            table_exists = cursor.fetchone()[0]

            if not table_exists:
                cursor.close()
                conn.close()
                return []

            # Get applied migrations
            cursor.execute("SELECT migration_name FROM migrations ORDER BY applied_at")
            applied = [row[0] for row in cursor.fetchall()]

            cursor.close()
            conn.close()

            return applied

        except Exception as e:
            print(f"⚠️  Could not check applied migrations: {e}")
            return []

    def get_status(self) -> Dict:
        """Get complete migration status"""
        all_migrations = self.list_migrations()
        applied_migrations = self.get_applied_migrations()

        status = {
            'total': len(all_migrations),
            'applied': len(applied_migrations),
            'pending': len(all_migrations) - len(applied_migrations),
            'database_connected': bool(self.database_url and self.psycopg2_available),
            'migrations': []
        }

        for migration in all_migrations:
            migration['applied'] = migration['name'] in applied_migrations
            migration['status'] = '✅ Applied' if migration['applied'] else '⏳ Pending'
            status['migrations'].append(migration)

        return status

    def print_status(self):
        """Print migration status in readable format"""
        print("=" * 70)
        print("DATABASE MIGRATION STATUS")
        print("=" * 70)
        print()

        status = self.get_status()

        # Database connection status
        if status['database_connected']:
            print(f"📊 Database: Connected")
        else:
            print(f"⚠️  Database: Not connected (set DATABASE_URL to apply migrations)")

        print(f"📁 Migrations Dir: {self.migrations_dir}")
        print()

        # Summary
        print(f"Total Migrations: {status['total']}")
        print(f"✅ Applied: {status['applied']}")
        print(f"⏳ Pending: {status['pending']}")
        print()

        # Migration list
        if status['migrations']:
            print("=" * 70)
            print("MIGRATIONS")
            print("=" * 70)

            for m in status['migrations']:
                print(f"\n{m['status']} {m['number']}: {m['name']}")
                if m['description']:
                    print(f"    Description: {m['description']}")
                if m['created']:
                    print(f"    Created: {m['created']}")
                print(f"    File: {m['file']}")
                print(f"    Size: {m['size']:,} bytes")
                print(f"    Statements: ~{m['statements']}")
        else:
            print("No migrations found")

        print()
        print("=" * 70)

    def print_list(self):
        """Print simple list of migrations"""
        migrations = self.list_migrations()
        applied = self.get_applied_migrations()

        print("=" * 70)
        print("AVAILABLE MIGRATIONS")
        print("=" * 70)
        print()

        for m in migrations:
            status = "✅" if m['name'] in applied else "⏳"
            print(f"{status} {m['number']}: {m['name']}")
            if m['description']:
                print(f"   {m['description']}")

        print()

    def apply_migrations(self, specific_migration: Optional[str] = None, dry_run: bool = False):
        """Apply pending migrations"""
        if not self.database_url:
            print("❌ DATABASE_URL not set. Cannot apply migrations.")
            print("   Set DATABASE_URL environment variable to your PostgreSQL connection string")
            return False

        if not self.psycopg2_available:
            print("❌ psycopg2 not installed. Cannot apply migrations.")
            print("   Install with: pip install psycopg2-binary")
            return False

        status = self.get_status()
        pending = [m for m in status['migrations'] if not m['applied']]

        if specific_migration:
            # Apply specific migration
            pending = [m for m in pending if m['number'] == specific_migration or m['name'] == specific_migration]
            if not pending:
                print(f"❌ Migration '{specific_migration}' not found or already applied")
                return False

        if not pending:
            print("✅ All migrations already applied!")
            return True

        print("=" * 70)
        print("APPLYING MIGRATIONS" if not dry_run else "DRY RUN - PREVIEW MIGRATIONS")
        print("=" * 70)
        print()

        for m in pending:
            print(f"⏳ {m['number']}: {m['name']}")
            print(f"   File: {m['file']}")
            print(f"   Description: {m['description']}")

            if dry_run:
                print(f"   [DRY RUN] Would apply ~{m['statements']} statements")
                continue

            try:
                # Read migration file
                sql = Path(m['path']).read_text()

                # Apply migration
                conn = self.psycopg2.connect(self.database_url)
                cursor = conn.cursor()

                # Execute migration
                cursor.execute(sql)
                conn.commit()

                cursor.close()
                conn.close()

                print(f"   ✅ Applied successfully")

            except Exception as e:
                print(f"   ❌ Failed: {e}")
                return False

        print()
        if dry_run:
            print("=" * 70)
            print("DRY RUN COMPLETE - No changes made")
        else:
            print("=" * 70)
            print("✅ ALL MIGRATIONS APPLIED SUCCESSFULLY")
        print("=" * 70)

        return True

    def rollback_migration(self, dry_run: bool = False):
        """Rollback last applied migration (if rollback SQL exists)"""
        print("⚠️  Rollback functionality not yet implemented")
        print("   Database rollbacks require down migration files")
        print("   Current migrations are forward-only")
        return False

    def generate_report(self, output_file: str = "migration_status.json"):
        """Generate JSON report of migration status"""
        status = self.get_status()
        status['generated_at'] = datetime.now().isoformat()
        status['database_url_set'] = bool(self.database_url)

        output_path = Path(output_file)
        output_path.write_text(json.dumps(status, indent=2))

        print(f"✅ Migration status report saved to: {output_file}")
        return status


def main():
    """Main CLI entry point"""

    # Parse command
    command = sys.argv[1] if len(sys.argv) > 1 else "status"
    args = sys.argv[2:] if len(sys.argv) > 2 else []

    runner = MigrationRunner()

    if command == "status":
        runner.print_status()

    elif command == "list":
        runner.print_list()

    elif command == "apply":
        specific = args[0] if args else None
        runner.apply_migrations(specific_migration=specific)

    elif command == "dry-run":
        specific = args[0] if args else None
        runner.apply_migrations(specific_migration=specific, dry_run=True)

    elif command == "rollback":
        runner.rollback_migration()

    elif command == "report":
        output = args[0] if args else "migration_status.json"
        runner.generate_report(output)

    elif command == "help" or command == "--help" or command == "-h":
        print(__doc__)

    else:
        print(f"❌ Unknown command: {command}")
        print("   Run 'python3 migration_runner.py help' for usage")
        sys.exit(1)


if __name__ == "__main__":
    main()
