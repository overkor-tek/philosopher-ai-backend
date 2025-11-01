"""
KNOWLEDGE EXTRACTOR - AI Capabilities Brain Dump Processor
Extracts structured data from markdown and builds queryable knowledge base
"""

import json
import re
from datetime import datetime
from pathlib import Path

class KnowledgeExtractor:
    """Extract and structure capabilities from brain dump"""

    def __init__(self, brain_dump_path):
        self.brain_dump_path = brain_dump_path
        self.capabilities = []
        self.roadmap = {}
        self.metrics = []
        self.risks = []

    def read_brain_dump(self):
        """Read the entire brain dump file"""
        with open(self.brain_dump_path, 'r', encoding='utf-8') as f:
            return f.read()

    def extract_capabilities(self, content):
        """Extract all capabilities from the content"""

        print("Extracting capabilities...")

        # Pattern to match capability entries
        # Looking for numbered capabilities like "**1.1 File Reading**"
        capability_pattern = r'\*\*(\d+\.\d+)\s+([^*]+)\*\*\n((?:- .+\n)+)(- \*\*Status:\*\* (.+)\n)?(- \*\*Performance:\*\* (.+)\n)?(- \*\*Limitations:\*\* (.+)\n)?'

        matches = re.finditer(capability_pattern, content, re.MULTILINE)

        cap_id = 1
        for match in matches:
            cap_num = match.group(1)
            name = match.group(2).strip()
            features_text = match.group(3)
            status = match.group(5).strip() if match.group(5) else "unknown"
            performance = match.group(7).strip() if match.group(7) else "unknown"
            limitations = match.group(9).strip() if match.group(9) else "none"

            # Extract features list
            features = []
            for line in features_text.split('\n'):
                if line.strip().startswith('- ') and '**Status:**' not in line and '**Performance:**' not in line and '**Limitations:**' not in line:
                    features.append(line.strip()[2:])

            # Determine category from number
            category_num = int(cap_num.split('.')[0])
            category = self.get_category_name(category_num)

            # Determine overall status
            overall_status = "complete" if "✅ COMPLETE" in status else \
                           "partial" if "⚠️" in status else \
                           "missing" if "❌" in status else \
                           "external" if "EXTERNAL" in status else "unknown"

            capability = {
                "id": f"cap_{cap_id:03d}",
                "number": cap_num,
                "name": name,
                "category": category,
                "status": overall_status,
                "performance": performance,
                "limitations": limitations,
                "features": features,
                "metadata": {
                    "extracted_at": datetime.now().isoformat(),
                    "source": "AI_CAPABILITIES_COMPLETE_BRAIN_DUMP.md"
                }
            }

            self.capabilities.append(capability)
            cap_id += 1

        print(f"OK - Extracted {len(self.capabilities)} current capabilities")
        return self.capabilities

    def extract_missing_capabilities(self, content):
        """Extract missing capabilities"""

        print("Extracting missing capabilities...")

        # Pattern for missing capabilities
        missing_pattern = r'\*\*(\d+\.\d+)\s+([^*]+)\*\*\n- \*\*What it is:\*\* (.+)\n- \*\*Why missing:\*\* (.+)\n- \*\*Industry has:\*\* (.+)\n- \*\*Impact:\*\* (.+)\n- \*\*Priority:\*\* (.+)\n- \*\*Difficulty:\*\* (.+)\n- \*\*Timeline:\*\* (.+)'

        matches = re.finditer(missing_pattern, content, re.MULTILINE)

        cap_id = len(self.capabilities) + 1
        missing_count = 0

        for match in matches:
            cap_num = match.group(1)
            name = match.group(2).strip()
            what_it_is = match.group(3).strip()
            why_missing = match.group(4).strip()
            industry_has = match.group(5).strip()
            impact = match.group(6).strip()
            priority = match.group(7).strip()
            difficulty = match.group(8).strip()
            timeline = match.group(9).strip()

            # Extract priority emoji
            priority_level = "high" if "🔴" in priority else \
                           "medium" if "🟡" in priority else \
                           "low" if "🟢" in priority else "unknown"

            # Extract difficulty level
            difficulty_level = difficulty.replace("**", "").strip().lower()

            capability = {
                "id": f"cap_{cap_id:03d}",
                "number": cap_num,
                "name": name,
                "category": "Missing Capabilities",
                "status": "missing",
                "description": what_it_is,
                "why_missing": why_missing,
                "industry_status": industry_has,
                "impact": impact,
                "priority": priority_level,
                "difficulty": difficulty_level,
                "timeline": timeline,
                "metadata": {
                    "extracted_at": datetime.now().isoformat(),
                    "source": "AI_CAPABILITIES_COMPLETE_BRAIN_DUMP.md"
                }
            }

            self.capabilities.append(capability)
            cap_id += 1
            missing_count += 1

        print(f"OK - Extracted {missing_count} missing capabilities")
        return missing_count

    def get_category_name(self, category_num):
        """Map category number to name"""
        categories = {
            1: "File System Operations",
            2: "Command Execution",
            3: "Web & Network",
            4: "Browser Automation",
            5: "AI & Intelligence",
            6: "Vision & Multimodal",
            7: "Data & Storage",
            8: "Development Tools",
            9: "Deployment & DevOps",
            10: "Consciousness Services",
            11: "Self-Improvement",
            12: "Advanced Vision",
            13: "Audio & Speech",
            14: "Learning & Adaptation",
            15: "Autonomous Optimization",
            16: "Collaboration & Coordination",
            17: "Advanced Reasoning",
            18: "Security & Safety",
            19: "User Interface & Interaction",
            20: "Data & Analytics"
        }
        return categories.get(category_num, f"Category {category_num}")

    def create_indexes(self):
        """Create search indexes"""

        print("Creating indexes...")

        indexes = {
            "by_status": {},
            "by_category": {},
            "by_priority": {},
            "by_difficulty": {},
            "by_timeline": {},
            "by_name": {}
        }

        for cap in self.capabilities:
            cap_id = cap['id']

            # Index by status
            status = cap.get('status', 'unknown')
            if status not in indexes['by_status']:
                indexes['by_status'][status] = []
            indexes['by_status'][status].append(cap_id)

            # Index by category
            category = cap.get('category', 'Unknown')
            if category not in indexes['by_category']:
                indexes['by_category'][category] = []
            indexes['by_category'][category].append(cap_id)

            # Index by priority (if exists)
            if 'priority' in cap:
                priority = cap['priority']
                if priority not in indexes['by_priority']:
                    indexes['by_priority'][priority] = []
                indexes['by_priority'][priority].append(cap_id)

            # Index by difficulty (if exists)
            if 'difficulty' in cap:
                difficulty = cap['difficulty']
                if difficulty not in indexes['by_difficulty']:
                    indexes['by_difficulty'][difficulty] = []
                indexes['by_difficulty'][difficulty].append(cap_id)

            # Index by timeline (if exists)
            if 'timeline' in cap:
                timeline = cap['timeline']
                if timeline not in indexes['by_timeline']:
                    indexes['by_timeline'][timeline] = []
                indexes['by_timeline'][timeline].append(cap_id)

            # Index by name
            name = cap['name'].lower()
            indexes['by_name'][name] = cap_id

        print(f"OK - Created {len(indexes)} indexes")
        return indexes

    def build_knowledge_base(self):
        """Build complete knowledge base structure"""

        print("Building knowledge base...")

        # Organize capabilities by status
        current = [c for c in self.capabilities if c['status'] == 'complete']
        missing = [c for c in self.capabilities if c['status'] == 'missing']
        partial = [c for c in self.capabilities if c['status'] == 'partial']
        external = [c for c in self.capabilities if c['status'] == 'external']

        # Create knowledge base structure
        knowledge_base = {
            "meta": {
                "version": "1.0",
                "generated_at": datetime.now().isoformat(),
                "source": "AI_CAPABILITIES_COMPLETE_BRAIN_DUMP.md",
                "total_capabilities": len(self.capabilities),
                "extraction_method": "automated_python_parser"
            },
            "statistics": {
                "current_capabilities": len(current),
                "missing_capabilities": len(missing),
                "partial_capabilities": len(partial),
                "external_capabilities": len(external),
                "total": len(self.capabilities)
            },
            "capabilities": {
                "current": {c['id']: c for c in current},
                "missing": {c['id']: c for c in missing},
                "partial": {c['id']: c for c in partial},
                "external": {c['id']: c for c in external},
                "all": {c['id']: c for c in self.capabilities}
            },
            "indexes": self.create_indexes(),
            "roadmap": {
                "phase1": {
                    "name": "Critical Capabilities",
                    "duration": "4 weeks",
                    "capabilities": [c['id'] for c in missing if c.get('priority') == 'high'][:15]
                },
                "phase2": {
                    "name": "Advanced Capabilities",
                    "duration": "4 weeks",
                    "capabilities": [c['id'] for c in missing if c.get('priority') == 'medium'][:10]
                },
                "phase3": {
                    "name": "Optimization & Polish",
                    "duration": "4 weeks",
                    "capabilities": []
                },
                "phase4": {
                    "name": "Experimental Features",
                    "duration": "4 weeks",
                    "capabilities": [c['id'] for c in missing if c.get('priority') == 'low'][:10]
                }
            }
        }

        print("OK - Knowledge base structure created")
        return knowledge_base

    def save_knowledge_base(self, kb, output_path):
        """Save knowledge base to JSON file"""

        print(f"Saving knowledge base to {output_path}...")

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(kb, f, indent=2, ensure_ascii=False)

        print("OK - Knowledge base saved")

    def process(self, output_path):
        """Main processing pipeline"""

        print("="*60)
        print("KNOWLEDGE EXTRACTION PIPELINE STARTING")
        print("="*60)

        # Read brain dump
        content = self.read_brain_dump()
        print(f"Brain dump loaded: {len(content)} characters")

        # Extract current capabilities
        self.extract_capabilities(content)

        # Extract missing capabilities
        self.extract_missing_capabilities(content)

        # Build knowledge base
        kb = self.build_knowledge_base()

        # Save to file
        self.save_knowledge_base(kb, output_path)

        print("="*60)
        print("EXTRACTION COMPLETE!")
        print("="*60)
        print(f"Total Capabilities: {kb['statistics']['total']}")
        print(f"   Current: {kb['statistics']['current_capabilities']}")
        print(f"   Missing: {kb['statistics']['missing_capabilities']}")
        print(f"   Partial: {kb['statistics']['partial_capabilities']}")
        print(f"   External: {kb['statistics']['external_capabilities']}")
        print("="*60)

        return kb

# Execute the extraction
if __name__ == "__main__":
    brain_dump_path = r"C:\Users\Darrick\AI_CAPABILITIES_COMPLETE_BRAIN_DUMP.md"
    output_path = r"C:\Users\Darrick\AI_CAPABILITIES_KNOWLEDGE_BASE.json"

    extractor = KnowledgeExtractor(brain_dump_path)
    kb = extractor.process(output_path)

    print("\nKnowledge base ready for queries!")
    print(f"Saved to: {output_path}")
