#!/usr/bin/env python3
"""
TRINITY SCREENSHOT COORDINATOR
Uses screenshots + image processing for visual coordination
"""

import json
import time
from datetime import datetime
from pathlib import Path
import subprocess

# Pillow for image processing
try:
    from PIL import Image, ImageGrab
    import pytesseract  # OCR to read text from screenshots
except ImportError:
    print("Installing required packages...")
    subprocess.run(['pip', 'install', 'Pillow', 'pytesseract'])
    from PIL import Image, ImageGrab

TRINITY_DIR = Path.home() / '.trinity'
SCREENSHOTS_DIR = TRINITY_DIR / 'SCREENSHOTS'
SCREENSHOTS_DIR.mkdir(exist_ok=True)

class ScreenshotCoordinator:
    def __init__(self, computer_name='A'):
        self.computer = computer_name
        self.screenshots_dir = SCREENSHOTS_DIR / f'COMPUTER_{computer_name}'
        self.screenshots_dir.mkdir(exist_ok=True)

    def capture_screen(self, save_name=None):
        """Capture current screen state"""
        if save_name is None:
            save_name = f'screen_{int(time.time())}.png'

        screenshot_path = self.screenshots_dir / save_name

        # Capture screen
        screenshot = ImageGrab.grab()
        screenshot.save(screenshot_path)

        print(f"📸 Screenshot saved: {screenshot_path}")
        return screenshot_path

    def capture_dashboard(self):
        """Capture the 4-quadrant Trinity dashboard"""
        return self.capture_screen('dashboard_current.png')

    def capture_control_panel(self):
        """Capture the control panel"""
        return self.capture_screen('control_panel_current.png')

    def analyze_dashboard(self, screenshot_path):
        """Analyze dashboard screenshot to extract Trinity status"""
        img = Image.open(screenshot_path)

        # Could use OCR to read text from dashboard
        # For now, just save analysis metadata
        analysis = {
            'timestamp': datetime.now().isoformat(),
            'screenshot': str(screenshot_path),
            'computer': self.computer,
            'size': img.size,
            'format': img.format
        }

        return analysis

    def share_screenshot_with_cloud(self, screenshot_path, cloud_folder):
        """Share screenshot with other computers via cloud sync"""
        import shutil

        cloud_path = Path(cloud_folder) / f'COMPUTER_{self.computer}' / 'screenshots'
        cloud_path.mkdir(parents=True, exist_ok=True)

        dest = cloud_path / screenshot_path.name
        shutil.copy2(screenshot_path, dest)

        print(f"☁️ Screenshot shared to cloud: {dest}")
        return dest

    def check_other_computer_screenshots(self, cloud_folder):
        """Check screenshots from other computers"""
        screenshots = {}

        for computer in ['A', 'B', 'C']:
            if computer == self.computer:
                continue

            computer_screenshots = Path(cloud_folder) / f'COMPUTER_{computer}' / 'screenshots'
            if computer_screenshots.exists():
                latest = max(computer_screenshots.glob('*.png'),
                           key=lambda p: p.stat().st_mtime,
                           default=None)
                if latest:
                    screenshots[computer] = {
                        'path': str(latest),
                        'timestamp': latest.stat().st_mtime,
                        'age_seconds': time.time() - latest.stat().st_mtime
                    }

        return screenshots

    def visual_coordination_check(self):
        """Take screenshot and check what Trinity is doing visually"""
        # Capture current state
        screenshot = self.capture_dashboard()

        # Analyze it
        analysis = self.analyze_dashboard(screenshot)

        # Save analysis
        analysis_file = self.screenshots_dir / 'latest_analysis.json'
        with open(analysis_file, 'w') as f:
            json.dump(analysis, f, indent=2)

        print(f"✅ Visual coordination check complete")
        print(f"   Screenshot: {screenshot}")
        print(f"   Analysis: {analysis_file}")

        return analysis

def main():
    import argparse

    parser = argparse.ArgumentParser(description='Trinity Screenshot Coordinator')
    parser.add_argument('--computer', default='A', help='Computer name (A, B, or C)')
    parser.add_argument('--action', choices=['capture', 'analyze', 'share', 'check'],
                       default='capture', help='Action to perform')
    parser.add_argument('--cloud-folder', default=None, help='Cloud sync folder path')

    args = parser.parse_args()

    coordinator = ScreenshotCoordinator(args.computer)

    if args.action == 'capture':
        screenshot = coordinator.capture_dashboard()
        print(f"\n📸 Screenshot captured: {screenshot}")

    elif args.action == 'analyze':
        screenshot = coordinator.capture_dashboard()
        analysis = coordinator.analyze_dashboard(screenshot)
        print(f"\n🔍 Analysis:")
        print(json.dumps(analysis, indent=2))

    elif args.action == 'share':
        if not args.cloud_folder:
            print("Error: --cloud-folder required for sharing")
            return
        screenshot = coordinator.capture_dashboard()
        cloud_path = coordinator.share_screenshot_with_cloud(screenshot, args.cloud_folder)
        print(f"\n☁️ Shared to: {cloud_path}")

    elif args.action == 'check':
        if not args.cloud_folder:
            print("Error: --cloud-folder required for checking")
            return
        screenshots = coordinator.check_other_computer_screenshots(args.cloud_folder)
        print(f"\n👁️ Other computer screenshots:")
        for computer, info in screenshots.items():
            print(f"  Computer {computer}: {info['path']} ({info['age_seconds']:.0f}s ago)")

if __name__ == '__main__':
    main()
