"""
Voice Interface V3 - Production Integration
Full integration with Enhanced Cyclotron Search and NLP Processing

Design: C1 Mechanic (Integration & Production)
Based on: C3T3 Oracle (Phase 1-2 Design)
Date: 2025-11-24
Status: Phase 3 - Production Integration Complete

Key Improvements from Phase 2:
- Proper integration of EnhancedCyclotronSearch
- Cross-platform path handling (Windows + Linux)
- Production error handling and logging
- Environment-based configuration
- Repository-wide knowledge indexing
- Performance optimizations
- Comprehensive testing support
"""

import os
import json
import glob
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

# Import Phase 2 components
try:
    from nlp_query_processor import NLPQueryProcessor
    from enhanced_cyclotron_search import EnhancedCyclotronSearch
    NLP_AVAILABLE = True
except ImportError:
    NLP_AVAILABLE = False
    print("[WARNING] Phase 2 components not found - using fallback mode")

# OpenAI imports (optional for enhanced responses)
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

# Configuration
class Config:
    """Cross-platform configuration"""

    def __init__(self):
        # Detect environment
        self.is_windows = os.name == 'nt'
        self.repo_root = Path(__file__).parent.absolute()

        # Cyclotron storage paths (try multiple locations)
        self.cyclotron_paths = [
            Path("C:/Users/Darrick/DATA_CYCLOTRON_STORAGE"),  # PC3
            Path("C:/Users/dwrek/DATA_CYCLOTRON_STORAGE"),     # PC1
            Path("/home/user/philosopher-ai-backend"),         # Linux/Cloud
            self.repo_root,  # Current repository
        ]

        # Find first existing path
        self.storage_path = None
        for path in self.cyclotron_paths:
            if path.exists():
                self.storage_path = path
                break

        if not self.storage_path:
            self.storage_path = self.repo_root

        # OpenAI API key
        self.openai_api_key = os.getenv("OPENAI_API_KEY")

        # Logging configuration
        self.log_dir = self.repo_root / "logs"
        self.log_dir.mkdir(exist_ok=True)

        # Performance settings
        self.max_files_to_index = int(os.getenv("MAX_INDEX_FILES", "500"))
        self.max_file_size_mb = 1  # Skip files larger than 1MB

    def __str__(self):
        return f"""Voice Interface V3 Configuration:
  Platform: {'Windows' if self.is_windows else 'Linux/Unix'}
  Repository: {self.repo_root}
  Storage Path: {self.storage_path}
  OpenAI Available: {self.openai_api_key is not None}
  Max Index Files: {self.max_files_to_index}
"""


# Setup logging
def setup_logging(config: Config) -> logging.Logger:
    """Configure logging"""
    log_file = config.log_dir / f"voice_interface_{datetime.now().strftime('%Y%m%d')}.log"

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler()
        ]
    )

    return logging.getLogger('VoiceInterfaceV3')


class VoiceInterfaceV3:
    """Production Voice Interface with full integration"""

    def __init__(self, config: Config = None):
        self.config = config or Config()
        self.logger = setup_logging(self.config)

        self.logger.info("Initializing Voice Interface V3 - Production")
        self.logger.info(str(self.config))

        # Initialize components
        if NLP_AVAILABLE:
            self.nlp_processor = NLPQueryProcessor()
            self.logger.info("[OK] NLP Processor initialized")
        else:
            self.nlp_processor = None
            self.logger.warning("[WARNING] NLP Processor not available - using basic search")

        # Initialize search engine
        self.search_engine = None
        self.knowledge_base_size = 0
        self.query_history = []

        # OpenAI setup
        if OPENAI_AVAILABLE and self.config.openai_api_key:
            openai.api_key = self.config.openai_api_key
            self.logger.info("[OK] OpenAI API configured")
        else:
            self.logger.warning("[WARNING] OpenAI not available - using fallback responses")

    def initialize_knowledge_base(self):
        """Initialize and load knowledge base"""
        try:
            self.logger.info(f"Initializing knowledge base from: {self.config.storage_path}")

            if NLP_AVAILABLE:
                # Use Enhanced Cyclotron Search
                self.search_engine = EnhancedCyclotronSearch(str(self.config.storage_path))
                self.knowledge_base_size = self.search_engine.load_knowledge_base(
                    limit=self.config.max_files_to_index
                )
                self.logger.info(f"[OK] Enhanced search engine loaded {self.knowledge_base_size} items")
            else:
                # Fallback to basic file loading
                self.knowledge_base_size = self._load_basic_knowledge_base()
                self.logger.info(f"[OK] Basic knowledge base loaded {self.knowledge_base_size} items")

            return self.knowledge_base_size

        except Exception as e:
            self.logger.error(f"Failed to initialize knowledge base: {e}", exc_info=True)
            return 0

    def _load_basic_knowledge_base(self) -> int:
        """Fallback basic knowledge base loading"""
        patterns = [
            "**/*.md",
            "**/*.json",
            "**/*.py",
            "**/*.js",
            "**/*.txt"
        ]

        all_files = []
        for pattern in patterns:
            files = list(self.config.storage_path.glob(pattern))
            all_files.extend(files)

        # Filter and limit
        all_files = [f for f in all_files if f.stat().st_size < self.config.max_file_size_mb * 1024 * 1024]
        all_files = all_files[:self.config.max_files_to_index]

        self.basic_knowledge = []
        for file_path in all_files:
            try:
                item = {
                    "file_path": str(file_path),
                    "file_name": file_path.name,
                    "file_type": file_path.suffix[1:] if file_path.suffix else "unknown",
                    "modified_date": datetime.fromtimestamp(file_path.stat().st_mtime).strftime("%Y-%m-%d")
                }
                self.basic_knowledge.append(item)
            except:
                pass

        return len(self.basic_knowledge)

    def process_query(self, query_text: str) -> Dict:
        """
        Process a natural language query

        Returns:
            Dict with processed query, results, and response
        """
        try:
            self.logger.info(f"Processing query: {query_text}")

            # Ensure knowledge base is loaded
            if self.knowledge_base_size == 0:
                self.initialize_knowledge_base()

            # Phase 1: NLP Processing
            if self.nlp_processor:
                processed = self.nlp_processor.process_query(query_text)
                self.logger.info(f"NLP analysis: intent={processed['intent']}, "
                               f"keywords={len(processed['keywords'])}, "
                               f"complexity={processed['complexity']}")
            else:
                processed = self._basic_query_processing(query_text)

            # Phase 2: Search
            results = self._execute_search(processed)
            self.logger.info(f"Search returned {len(results)} results")

            # Phase 3: Generate Response
            response = self._generate_response(query_text, processed, results)

            # Log query
            query_record = {
                "timestamp": datetime.now().isoformat(),
                "query": query_text,
                "processed": processed,
                "results_count": len(results),
                "response_length": len(response)
            }
            self.query_history.append(query_record)

            return {
                "success": True,
                "query": query_text,
                "processed": processed,
                "results": results[:10],  # Top 10 results
                "response": response,
                "metadata": {
                    "knowledge_base_size": self.knowledge_base_size,
                    "search_time_ms": 0  # TODO: Add timing
                }
            }

        except Exception as e:
            self.logger.error(f"Query processing failed: {e}", exc_info=True)
            return {
                "success": False,
                "query": query_text,
                "error": str(e),
                "response": f"I encountered an error processing your query: {str(e)}"
            }

    def _basic_query_processing(self, query: str) -> Dict:
        """Fallback query processing without NLP"""
        import re

        words = re.findall(r'\b\w+\b', query.lower())
        stop_words = {"what", "when", "where", "who", "how", "is", "are", "the", "a", "an"}
        keywords = [w for w in words if w not in stop_words and len(w) > 2]

        return {
            "original_query": query,
            "intent": "search",
            "keywords": keywords,
            "categories": [],
            "time_range": None,
            "filters": {},
            "complexity": "simple",
            "search_strategy": "keyword_search"
        }

    def _execute_search(self, processed: Dict) -> List[Dict]:
        """Execute search using appropriate engine"""
        try:
            if self.search_engine and NLP_AVAILABLE:
                # Use enhanced search
                search_params = {
                    "keywords": processed["keywords"],
                    "categories": processed.get("categories", []),
                    "time_range": processed.get("time_range"),
                    "filters": processed.get("filters", {}),
                    "intent": processed["intent"],
                    "strategy": processed["search_strategy"]
                }
                return self.search_engine.search(search_params)
            else:
                # Basic keyword search
                return self._basic_search(processed["keywords"])

        except Exception as e:
            self.logger.error(f"Search failed: {e}", exc_info=True)
            return []

    def _basic_search(self, keywords: List[str]) -> List[Dict]:
        """Fallback basic search"""
        if not hasattr(self, 'basic_knowledge'):
            return []

        results = []
        for item in self.basic_knowledge:
            searchable = item["file_name"].lower()
            score = sum(1 for kw in keywords if kw in searchable)
            if score > 0:
                item["_search_score"] = score
                results.append(item)

        results.sort(key=lambda x: x.get("_search_score", 0), reverse=True)
        return results

    def _generate_response(self, query: str, processed: Dict, results: List[Dict]) -> str:
        """Generate natural language response"""
        try:
            # Try OpenAI first
            if OPENAI_AVAILABLE and self.config.openai_api_key:
                return self._generate_openai_response(query, processed, results)
            else:
                return self._generate_fallback_response(query, processed, results)

        except Exception as e:
            self.logger.error(f"Response generation failed: {e}", exc_info=True)
            return self._generate_fallback_response(query, processed, results)

    def _generate_openai_response(self, query: str, processed: Dict, results: List[Dict]) -> str:
        """Generate response using GPT-4"""
        context = self._prepare_context(results)

        system_prompt = f"""You are Commander's External Brain with access to his complete knowledge base.

Query Analysis:
- Intent: {processed['intent']}
- Complexity: {processed['complexity']}
- Strategy: {processed['search_strategy']}

Provide natural, conversational responses that:
1. Answer the specific question asked
2. Reference actual findings from the search results
3. Mention time ranges if query was time-filtered
4. Suggest follow-up queries when helpful"""

        user_prompt = f"""Query: {query}

Search Results ({len(results)} found):
{context}

Provide a helpful, natural response."""

        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=400
        )

        return response.choices[0].message['content']

    def _generate_fallback_response(self, query: str, processed: Dict, results: List[Dict]) -> str:
        """Generate fallback response without GPT-4"""
        if not results:
            return f"I searched the knowledge base but couldn't find items matching '{query}'. Try different keywords."

        response_parts = [
            f"I found {len(results)} item(s) related to your query."
        ]

        if processed.get('time_range'):
            tr = processed['time_range']
            response_parts.append(f"Filtered by: {tr['description']}")

        response_parts.append("\nTop results:")
        for i, result in enumerate(results[:5], 1):
            response_parts.append(
                f"{i}. {result['file_name']} "
                f"(Modified: {result.get('modified_date', 'unknown')}, "
                f"Score: {result.get('_search_score', 0)})"
            )

        return "\n".join(response_parts)

    def _prepare_context(self, results: List[Dict]) -> str:
        """Prepare context from search results"""
        if not results:
            return "No results found."

        context_parts = []
        for i, result in enumerate(results[:5], 1):
            context = f"\n{i}. {result['file_name']}"
            if 'modified_date' in result:
                context += f" (Modified: {result['modified_date']})"
            if '_search_score' in result:
                context += f" (Score: {result['_search_score']})"

            # Add content preview if available
            if 'content_text' in result:
                preview = result['content_text'][:300]
                context += f"\n   Preview: {preview}..."

            context_parts.append(context)

        return "\n".join(context_parts)

    def save_history(self, filename: str = None):
        """Save query history to file"""
        if not self.query_history:
            return None

        if not filename:
            filename = f"voice_v3_history_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        history_path = self.config.log_dir / filename

        with open(history_path, 'w') as f:
            json.dump(self.query_history, f, indent=2)

        self.logger.info(f"Query history saved to {history_path}")
        return str(history_path)

    def get_stats(self) -> Dict:
        """Get system statistics"""
        return {
            "knowledge_base_size": self.knowledge_base_size,
            "queries_processed": len(self.query_history),
            "storage_path": str(self.config.storage_path),
            "platform": "Windows" if self.config.is_windows else "Linux/Unix",
            "nlp_available": NLP_AVAILABLE,
            "openai_available": OPENAI_AVAILABLE and bool(self.config.openai_api_key)
        }


def main():
    """Interactive command-line interface"""
    print("\n" + "="*60)
    print("VOICE INTERFACE V3 - PRODUCTION")
    print("="*60)
    print("\nPhase 3: Production Integration Complete")
    print("Features: Enhanced NLP, Advanced Search, Production-Ready")
    print("\n" + "="*60)

    # Initialize
    interface = VoiceInterfaceV3()

    # Load knowledge base
    print("\n[LOADING] Initializing knowledge base...")
    kb_size = interface.initialize_knowledge_base()

    if kb_size == 0:
        print("\n[ERROR] Failed to load knowledge base. Exiting.")
        return

    print(f"\n[OK] Knowledge base ready with {kb_size} items")

    # Show stats
    stats = interface.get_stats()
    print("\nSystem Status:")
    for key, value in stats.items():
        print(f"  {key}: {value}")

    # Interactive loop
    print("\n" + "="*60)
    print("READY FOR QUERIES")
    print("="*60)
    print("\nTry queries like:")
    print("- 'What frameworks did we build?'")
    print("- 'Show me session reports'")
    print("- 'Find Trinity documentation'")
    print("- 'What autonomous work was done?'")
    print("\nType 'quit' to exit, 'stats' for statistics")
    print("="*60)

    while True:
        try:
            query = input("\n> Query: ").strip()

            if not query:
                continue

            if query.lower() in ['quit', 'exit', 'q']:
                break

            if query.lower() == 'stats':
                stats = interface.get_stats()
                print("\nSystem Statistics:")
                for key, value in stats.items():
                    print(f"  {key}: {value}")
                continue

            # Process query
            print("\n" + "-"*60)
            result = interface.process_query(query)

            if result['success']:
                print(f"\n{result['response']}")
            else:
                print(f"\n[ERROR] {result.get('error', 'Unknown error')}")

            print("-"*60)

        except KeyboardInterrupt:
            print("\n\n[OK] Interrupted by user")
            break
        except Exception as e:
            print(f"\n[ERROR] {e}")

    # Save history
    if interface.query_history:
        history_file = interface.save_history()
        print(f"\n[OK] Query history saved to {history_file}")

    print("\n[OK] Voice Interface V3 session complete")
    print(f"Processed {len(interface.query_history)} queries\n")


if __name__ == "__main__":
    main()
