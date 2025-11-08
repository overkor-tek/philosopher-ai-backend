#!/usr/bin/env python3
"""
🌪️ DATA CYCLOTRON - LOGGING SYSTEM
Comprehensive logging and error tracking
"""

import os
import logging
import json
from datetime import datetime
from pathlib import Path
from typing import Optional

# ========================================
# CONFIGURATION
# ========================================

LOG_DIR = "C:/Users/Darrick/DATA_CYCLOTRON_LOGS"
os.makedirs(LOG_DIR, exist_ok=True)

# ========================================
# CYCLOTRON LOGGER
# ========================================

class CyclotronLogger:
    """Centralized logging for all cyclotron components"""

    def __init__(self, component_name: str, log_level: str = "INFO"):
        self.component_name = component_name
        self.log_file = f"{LOG_DIR}/{component_name}_{datetime.now().strftime('%Y%m%d')}.log"
        self.error_file = f"{LOG_DIR}/{component_name}_errors_{datetime.now().strftime('%Y%m%d')}.log"
        self.metrics_file = f"{LOG_DIR}/{component_name}_metrics_{datetime.now().strftime('%Y%m%d')}.json"

        # Set up logger
        self.logger = logging.getLogger(component_name)
        self.logger.setLevel(getattr(logging, log_level.upper()))

        # Clear existing handlers
        self.logger.handlers = []

        # Console handler (colorful output)
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_formatter = logging.Formatter(
            '%(asctime)s | %(levelname)s | %(message)s',
            datefmt='%H:%M:%S'
        )
        console_handler.setFormatter(console_formatter)
        self.logger.addHandler(console_handler)

        # File handler (detailed output)
        file_handler = logging.FileHandler(self.log_file, encoding='utf-8')
        file_handler.setLevel(logging.DEBUG)
        file_formatter = logging.Formatter(
            '%(asctime)s | %(name)s | %(levelname)s | %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(file_formatter)
        self.logger.addHandler(file_handler)

        # Error file handler (errors only)
        error_handler = logging.FileHandler(self.error_file, encoding='utf-8')
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(file_formatter)
        self.logger.addHandler(error_handler)

        # Metrics tracking
        self.metrics = {
            'started_at': datetime.now().isoformat(),
            'component': component_name,
            'total_processed': 0,
            'total_errors': 0,
            'total_warnings': 0,
            'events': []
        }

    def info(self, message: str):
        """Log info message"""
        self.logger.info(message)

    def debug(self, message: str):
        """Log debug message"""
        self.logger.debug(message)

    def warning(self, message: str):
        """Log warning"""
        self.logger.warning(message)
        self.metrics['total_warnings'] += 1

    def error(self, message: str, exception: Optional[Exception] = None):
        """Log error"""
        if exception:
            self.logger.error(f"{message} | Exception: {str(exception)}")
        else:
            self.logger.error(message)

        self.metrics['total_errors'] += 1

    def critical(self, message: str, exception: Optional[Exception] = None):
        """Log critical error"""
        if exception:
            self.logger.critical(f"{message} | Exception: {str(exception)}")
        else:
            self.logger.critical(message)

        self.metrics['total_errors'] += 1

    def track_processing(self, item_type: str, success: bool = True):
        """Track processing metrics"""
        self.metrics['total_processed'] += 1

        event = {
            'timestamp': datetime.now().isoformat(),
            'type': item_type,
            'success': success
        }
        self.metrics['events'].append(event)

        # Keep only last 100 events in memory
        if len(self.metrics['events']) > 100:
            self.metrics['events'] = self.metrics['events'][-100:]

    def save_metrics(self):
        """Save metrics to file"""
        try:
            with open(self.metrics_file, 'w', encoding='utf-8') as f:
                json.dump(self.metrics, f, indent=2, ensure_ascii=False)
        except Exception as e:
            self.logger.error(f"Failed to save metrics: {e}")

    def get_metrics(self) -> dict:
        """Get current metrics"""
        return self.metrics.copy()

# ========================================
# ERROR HANDLER DECORATOR
# ========================================

def handle_errors(logger: CyclotronLogger, default_return=None):
    """Decorator for error handling"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                logger.error(f"Error in {func.__name__}: {str(e)}", exception=e)
                return default_return
        return wrapper
    return decorator

# ========================================
# LOG ANALYZER
# ========================================

class LogAnalyzer:
    """Analyze cyclotron logs"""

    def __init__(self, log_dir: str = LOG_DIR):
        self.log_dir = log_dir

    def get_recent_errors(self, component: str = None, limit: int = 10) -> list:
        """Get recent errors from logs"""
        import glob

        if component:
            error_files = glob.glob(f"{self.log_dir}/{component}_errors_*.log")
        else:
            error_files = glob.glob(f"{self.log_dir}/*_errors_*.log")

        errors = []

        for error_file in error_files:
            try:
                with open(error_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    errors.extend(lines[-limit:])
            except Exception as e:
                print(f"Could not read {error_file}: {e}")

        return errors[-limit:]

    def get_metrics_summary(self) -> dict:
        """Get summary of all metrics"""
        import glob

        metrics_files = glob.glob(f"{self.log_dir}/*_metrics_*.json")

        summary = {
            'total_components': 0,
            'total_processed': 0,
            'total_errors': 0,
            'total_warnings': 0,
            'components': {}
        }

        for metrics_file in metrics_files:
            try:
                with open(metrics_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                component = data.get('component', 'unknown')
                summary['components'][component] = data
                summary['total_processed'] += data.get('total_processed', 0)
                summary['total_errors'] += data.get('total_errors', 0)
                summary['total_warnings'] += data.get('total_warnings', 0)
                summary['total_components'] += 1

            except Exception as e:
                print(f"Could not read {metrics_file}: {e}")

        return summary

    def print_summary(self):
        """Print formatted summary"""
        print("\n📊 DATA CYCLOTRON - LOGS SUMMARY")
        print("=" * 60)

        summary = self.get_metrics_summary()

        print(f"\n🎯 Overall Metrics:")
        print(f"   Components: {summary['total_components']}")
        print(f"   Total Processed: {summary['total_processed']}")
        print(f"   Total Errors: {summary['total_errors']}")
        print(f"   Total Warnings: {summary['total_warnings']}")

        print(f"\n🔧 Component Breakdown:")
        for component, data in summary['components'].items():
            print(f"\n   {component}:")
            print(f"      Started: {data.get('started_at', 'unknown')}")
            print(f"      Processed: {data.get('total_processed', 0)}")
            print(f"      Errors: {data.get('total_errors', 0)}")
            print(f"      Warnings: {data.get('total_warnings', 0)}")

        # Show recent errors
        recent_errors = self.get_recent_errors(limit=5)
        if recent_errors:
            print(f"\n⚠️  Recent Errors (last 5):")
            for error in recent_errors:
                print(f"   {error.strip()}")

        print("\n" + "=" * 60)

# ========================================
# EXAMPLE USAGE
# ========================================

if __name__ == "__main__":
    # Example: Using the logger
    logger = CyclotronLogger("example_component")

    logger.info("Component started")
    logger.debug("Debug information here")
    logger.warning("Warning message")

    try:
        # Simulate some processing
        for i in range(10):
            logger.track_processing("test_item", success=True)
    except Exception as e:
        logger.error("Processing failed", exception=e)

    # Save metrics
    logger.save_metrics()

    # Analyze logs
    print("\n" + "=" * 60)
    analyzer = LogAnalyzer()
    analyzer.print_summary()
