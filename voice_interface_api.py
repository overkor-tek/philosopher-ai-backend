#!/usr/bin/env python3
"""
Voice Interface V3 - API Wrapper
Simple Flask API for integrating Voice Interface with frontends

Created: 2025-11-24
Purpose: Enable frontend/mobile apps to use Voice Interface via REST API
"""

import os
import json
from pathlib import Path
from typing import Dict

try:
    from flask import Flask, request, jsonify
    from flask_cors import CORS
    FLASK_AVAILABLE = True
except ImportError:
    FLASK_AVAILABLE = False
    print("[WARNING] Flask not available - install with: pip install flask flask-cors")

from voice_interface_v3_production import VoiceInterfaceV3, Config


# Initialize Flask app
app = Flask(__name__)

# Enable CORS for frontend integration
if FLASK_AVAILABLE:
    CORS(app)

# Initialize Voice Interface (singleton)
voice_interface = None


def get_interface() -> VoiceInterfaceV3:
    """Get or create Voice Interface instance"""
    global voice_interface

    if voice_interface is None:
        config = Config()
        voice_interface = VoiceInterfaceV3(config)
        voice_interface.initialize_knowledge_base()

    return voice_interface


# ==================== API ENDPOINTS ====================

@app.route('/api/v1/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "service": "voice-interface",
        "version": "3.0"
    })


@app.route('/api/v1/stats', methods=['GET'])
def get_stats():
    """Get system statistics"""
    try:
        interface = get_interface()
        stats = interface.get_stats()

        return jsonify({
            "success": True,
            "stats": stats
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/v1/query', methods=['POST'])
def process_query():
    """
    Process a voice/text query

    Request body:
    {
        "query": "What is Trinity?",
        "max_results": 10  // optional
    }

    Response:
    {
        "success": true,
        "query": "What is Trinity?",
        "results": [...],
        "response": "...",
        "metadata": {...}
    }
    """
    try:
        data = request.get_json()

        if not data or 'query' not in data:
            return jsonify({
                "success": False,
                "error": "Missing 'query' in request body"
            }), 400

        query_text = data['query']
        max_results = data.get('max_results', 10)

        # Validate query
        if not query_text or not isinstance(query_text, str):
            return jsonify({
                "success": False,
                "error": "Invalid query"
            }), 400

        if len(query_text) > 1000:
            return jsonify({
                "success": False,
                "error": "Query too long (max 1000 characters)"
            }), 400

        # Process query
        interface = get_interface()
        result = interface.process_query(query_text)

        # Limit results
        if 'results' in result:
            result['results'] = result['results'][:max_results]

        return jsonify(result)

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/v1/search', methods=['POST'])
def search_knowledge():
    """
    Search knowledge base with advanced parameters

    Request body:
    {
        "keywords": ["trinity", "framework"],
        "categories": ["frameworks"],  // optional
        "time_range": {  // optional
            "start": "2025-11-01",
            "end": "2025-11-24"
        },
        "filters": {  // optional
            "source": "C1_MECHANIC",
            "file_type": "markdown"
        },
        "max_results": 20  // optional
    }
    """
    try:
        data = request.get_json()

        if not data or 'keywords' not in data:
            return jsonify({
                "success": False,
                "error": "Missing 'keywords' in request body"
            }), 400

        interface = get_interface()

        # Build search parameters
        search_params = {
            "keywords": data.get('keywords', []),
            "categories": data.get('categories', []),
            "time_range": data.get('time_range'),
            "filters": data.get('filters', {}),
            "intent": "search",
            "strategy": data.get('strategy', 'keyword_search')
        }

        # Execute search
        if interface.search_engine:
            results = interface.search_engine.search(search_params)
        else:
            return jsonify({
                "success": False,
                "error": "Search engine not available"
            }), 503

        # Limit results
        max_results = data.get('max_results', 20)
        results = results[:max_results]

        return jsonify({
            "success": True,
            "results": results,
            "count": len(results),
            "search_params": search_params
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/v1/history', methods=['GET'])
def get_query_history():
    """Get query history"""
    try:
        interface = get_interface()

        # Get last N queries
        limit = request.args.get('limit', default=50, type=int)
        history = interface.query_history[-limit:]

        return jsonify({
            "success": True,
            "history": history,
            "total": len(interface.query_history)
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/v1/categories', methods=['GET'])
def get_categories():
    """Get available knowledge categories"""
    categories = [
        "frameworks",
        "autonomous_work",
        "session_reports",
        "strategic",
        "consciousness",
        "oracle",
        "technical",
        "deployment",
        "trinity",
        "cyclotron"
    ]

    return jsonify({
        "success": True,
        "categories": categories
    })


@app.route('/api/v1/intents', methods=['GET'])
def get_intents():
    """Get available query intents"""
    intents = [
        "search",
        "explain",
        "summarize",
        "compare",
        "recommend",
        "count"
    ]

    return jsonify({
        "success": True,
        "intents": intents
    })


# ==================== MAIN ====================

def main():
    """Run the API server"""
    if not FLASK_AVAILABLE:
        print("[ERROR] Flask not available")
        print("Install with: pip install flask flask-cors")
        return

    print("\n" + "="*70)
    print("VOICE INTERFACE V3 - API SERVER")
    print("="*70)

    # Initialize interface
    print("\n[INIT] Initializing Voice Interface...")
    interface = get_interface()
    print(f"[OK] Knowledge base loaded: {interface.knowledge_base_size} items")

    # Print available endpoints
    print("\n" + "="*70)
    print("AVAILABLE ENDPOINTS")
    print("="*70)
    print("\nGET  /api/v1/health       - Health check")
    print("GET  /api/v1/stats        - System statistics")
    print("POST /api/v1/query        - Process natural language query")
    print("POST /api/v1/search       - Advanced knowledge search")
    print("GET  /api/v1/history      - Query history")
    print("GET  /api/v1/categories   - Available categories")
    print("GET  /api/v1/intents      - Available intents")

    # Example usage
    print("\n" + "="*70)
    print("EXAMPLE USAGE")
    print("="*70)
    print("""
# Query endpoint
curl -X POST http://localhost:5000/api/v1/query \\
  -H "Content-Type: application/json" \\
  -d '{"query": "What is Trinity?"}'

# Search endpoint
curl -X POST http://localhost:5000/api/v1/search \\
  -H "Content-Type: application/json" \\
  -d '{"keywords": ["trinity", "framework"], "max_results": 5}'

# Stats endpoint
curl http://localhost:5000/api/v1/stats
    """)

    # Start server
    print("\n" + "="*70)
    print("STARTING SERVER")
    print("="*70)

    port = int(os.getenv('PORT', 5000))
    host = os.getenv('HOST', '0.0.0.0')

    print(f"\nServer starting on http://{host}:{port}")
    print("Press Ctrl+C to stop\n")

    app.run(
        host=host,
        port=port,
        debug=False,  # Set to True for development
        threaded=True  # Handle multiple requests
    )


if __name__ == "__main__":
    main()
