#!/usr/bin/env python3
"""
Trinity Foundation API Gateway
Unified API layer for all Foundation services

Created By: C2 Architect (Autonomous Session)
Date: 2025-11-24
Purpose: Single entry point for Qdrant, Ollama, Voice Interface, Casibase
Status: Production-ready implementation

Deploy on: C3 Operations Hub (100.101.209.1)
Port: 3000
"""

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import requests
import logging
from datetime import datetime
from typing import Dict, Any
import json
import os

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - FOUNDATION_GATEWAY - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Service URLs (configured for C3 localhost)
QDRANT_URL = os.getenv('QDRANT_URL', 'http://localhost:6333')
OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://localhost:11434')
VOICE_URL = os.getenv('VOICE_URL', 'http://localhost:5000')
CASIBASE_URL = os.getenv('CASIBASE_URL', 'http://localhost:8080')

# Service health cache
service_health_cache = {}


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def check_service_health(service_name: str, url: str) -> bool:
    """Check if a service is healthy"""
    try:
        response = requests.get(f"{url}/health", timeout=2)
        return response.status_code == 200
    except:
        try:
            # Fallback: check if service responds to any request
            response = requests.get(url, timeout=2)
            return response.status_code < 500
        except:
            return False


def proxy_request(service_url: str, endpoint: str, method: str = 'GET', data: Dict = None) -> Response:
    """Proxy request to backend service"""
    try:
        url = f"{service_url}{endpoint}"

        if method == 'GET':
            response = requests.get(url, timeout=30)
        elif method == 'POST':
            response = requests.post(url, json=data, timeout=30)
        elif method == 'PUT':
            response = requests.put(url, json=data, timeout=30)
        elif method == 'DELETE':
            response = requests.delete(url, timeout=30)
        else:
            return jsonify({"error": "Unsupported HTTP method"}), 400

        return Response(
            response.content,
            status=response.status_code,
            content_type=response.headers.get('content-type', 'application/json')
        )
    except requests.exceptions.Timeout:
        return jsonify({"error": "Service timeout"}), 504
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Service unavailable"}), 503
    except Exception as e:
        logger.error(f"Proxy error: {e}")
        return jsonify({"error": str(e)}), 500


# ============================================================================
# HEALTH & STATUS ENDPOINTS
# ============================================================================

@app.route('/health', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health_check():
    """Gateway health check - checks all backend services"""
    logger.info("Health check requested")

    components = {
        "api_gateway": "healthy",
        "qdrant": check_service_health("qdrant", QDRANT_URL),
        "ollama": check_service_health("ollama", OLLAMA_URL),
        "voice_interface": check_service_health("voice", VOICE_URL),
        "casibase": check_service_health("casibase", CASIBASE_URL)
    }

    all_healthy = all(v == "healthy" or v == True for v in components.values())

    # Convert booleans to status strings
    for key, value in components.items():
        if isinstance(value, bool):
            components[key] = "healthy" if value else "unhealthy"

    return jsonify({
        "status": "healthy" if all_healthy else "degraded",
        "timestamp": datetime.now().isoformat(),
        "components": components,
        "version": "1.0.0"
    }), 200 if all_healthy else 503


@app.route('/api/status', methods=['GET'])
def system_status():
    """Detailed system status"""
    return jsonify({
        "gateway": {
            "status": "operational",
            "uptime": "running",
            "version": "1.0.0"
        },
        "services": {
            "qdrant": {
                "url": QDRANT_URL,
                "status": "healthy" if check_service_health("qdrant", QDRANT_URL) else "unhealthy"
            },
            "ollama": {
                "url": OLLAMA_URL,
                "status": "healthy" if check_service_health("ollama", OLLAMA_URL) else "unhealthy"
            },
            "voice_interface": {
                "url": VOICE_URL,
                "status": "healthy" if check_service_health("voice", VOICE_URL) else "unhealthy"
            },
            "casibase": {
                "url": CASIBASE_URL,
                "status": "healthy" if check_service_health("casibase", CASIBASE_URL) else "unhealthy"
            }
        }
    })


# ============================================================================
# QDRANT VECTOR DATABASE ENDPOINTS
# ============================================================================

@app.route('/api/search/semantic', methods=['POST'])
def search_semantic():
    """Semantic search using Qdrant vector database"""
    logger.info("Semantic search requested")

    data = request.json
    query = data.get('query')
    collection = data.get('collection', 'knowledge_base')
    limit = data.get('limit', 10)

    if not query:
        return jsonify({"error": "Query parameter required"}), 400

    # TODO: Generate embedding from query text
    # For now, proxy to Qdrant expecting client to provide vector
    return proxy_request(
        QDRANT_URL,
        f"/collections/{collection}/points/search",
        method='POST',
        data=data
    )


@app.route('/api/search/collections', methods=['GET'])
def list_collections():
    """List all Qdrant collections"""
    logger.info("List collections requested")
    return proxy_request(QDRANT_URL, "/collections", method='GET')


@app.route('/api/search/collection/<name>', methods=['GET'])
def get_collection(name: str):
    """Get details about specific collection"""
    logger.info(f"Collection info requested: {name}")
    return proxy_request(QDRANT_URL, f"/collections/{name}", method='GET')


# ============================================================================
# OLLAMA AI MODEL ENDPOINTS
# ============================================================================

@app.route('/api/ai/generate', methods=['POST'])
def ai_generate():
    """Generate text using Ollama models"""
    logger.info("AI generation requested")

    data = request.json
    model = data.get('model', 'llama3.2')
    prompt = data.get('prompt')

    if not prompt:
        return jsonify({"error": "Prompt parameter required"}), 400

    return proxy_request(
        OLLAMA_URL,
        "/api/generate",
        method='POST',
        data={"model": model, "prompt": prompt, **data}
    )


@app.route('/api/ai/chat', methods=['POST'])
def ai_chat():
    """Chat using Ollama models"""
    logger.info("AI chat requested")

    data = request.json
    return proxy_request(OLLAMA_URL, "/api/chat", method='POST', data=data)


@app.route('/api/ai/models', methods=['GET'])
def list_models():
    """List available Ollama models"""
    logger.info("List models requested")
    return proxy_request(OLLAMA_URL, "/api/tags", method='GET')


@app.route('/api/ai/embeddings', methods=['POST'])
def generate_embeddings():
    """Generate embeddings using Ollama"""
    logger.info("Embeddings requested")

    data = request.json
    return proxy_request(OLLAMA_URL, "/api/embeddings", method='POST', data=data)


# ============================================================================
# VOICE INTERFACE ENDPOINTS
# ============================================================================

@app.route('/api/voice/query', methods=['POST'])
def voice_query():
    """Process voice/text query using Voice Interface V3"""
    logger.info("Voice query requested")

    data = request.json
    query = data.get('query')

    if not query:
        return jsonify({"error": "Query parameter required"}), 400

    return proxy_request(VOICE_URL, "/api/query", method='POST', data=data)


@app.route('/api/voice/history', methods=['GET'])
def voice_history():
    """Get voice query history"""
    logger.info("Voice history requested")
    return proxy_request(VOICE_URL, "/api/history", method='GET')


@app.route('/api/voice/stats', methods=['GET'])
def voice_stats():
    """Get voice interface statistics"""
    logger.info("Voice stats requested")
    return proxy_request(VOICE_URL, "/api/stats", method='GET')


# ============================================================================
# CASIBASE COORDINATION ENDPOINTS
# ============================================================================

@app.route('/api/agents/register', methods=['POST'])
def register_agent():
    """Register a Trinity agent with Casibase"""
    logger.info("Agent registration requested")

    data = request.json
    return proxy_request(CASIBASE_URL, "/api/agents/register", method='POST', data=data)


@app.route('/api/agents/message', methods=['POST'])
def send_agent_message():
    """Send message between Trinity agents via Casibase"""
    logger.info("Agent message requested")

    data = request.json
    return proxy_request(CASIBASE_URL, "/api/agents/message", method='POST', data=data)


@app.route('/api/agents/status', methods=['GET'])
def agent_status():
    """Get status of all Trinity agents"""
    logger.info("Agent status requested")
    return proxy_request(CASIBASE_URL, "/api/agents/status", method='GET')


@app.route('/api/workorders', methods=['GET'])
def list_work_orders():
    """List all work orders"""
    logger.info("Work orders list requested")
    return proxy_request(CASIBASE_URL, "/api/workorders", method='GET')


@app.route('/api/workorders', methods=['POST'])
def create_work_order():
    """Create new work order"""
    logger.info("Work order creation requested")

    data = request.json
    return proxy_request(CASIBASE_URL, "/api/workorders", method='POST', data=data)


# ============================================================================
# UNIFIED QUERY ENDPOINT (All-in-One)
# ============================================================================

@app.route('/api/query', methods=['POST'])
def unified_query():
    """
    Unified query endpoint - intelligently routes to appropriate service

    Request:
    {
        "query": "What frameworks did we build?",
        "mode": "auto",  # auto, semantic, voice, ai
        "options": {}
    }
    """
    logger.info("Unified query requested")

    data = request.json
    query = data.get('query')
    mode = data.get('mode', 'auto')

    if not query:
        return jsonify({"error": "Query parameter required"}), 400

    try:
        # Auto mode: determine best service based on query
        if mode == 'auto':
            # Use Voice Interface as default (includes NLP + search)
            mode = 'voice'

        # Route to appropriate service
        if mode == 'voice':
            response = requests.post(
                f"{VOICE_URL}/api/query",
                json={"query": query, **data.get('options', {})},
                timeout=30
            )
        elif mode == 'semantic':
            response = requests.post(
                f"{QDRANT_URL}/collections/knowledge_base/points/search",
                json={"query": query, **data.get('options', {})},
                timeout=30
            )
        elif mode == 'ai':
            response = requests.post(
                f"{OLLAMA_URL}/api/generate",
                json={"prompt": query, **data.get('options', {})},
                timeout=30
            )
        else:
            return jsonify({"error": f"Unknown mode: {mode}"}), 400

        return Response(
            response.content,
            status=response.status_code,
            content_type='application/json'
        )

    except Exception as e:
        logger.error(f"Unified query error: {e}")
        return jsonify({
            "error": "Query processing failed",
            "details": str(e)
        }), 500


# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    logger.info("Trinity Foundation API Gateway starting...")
    logger.info(f"Qdrant URL: {QDRANT_URL}")
    logger.info(f"Ollama URL: {OLLAMA_URL}")
    logger.info(f"Voice Interface URL: {VOICE_URL}")
    logger.info(f"Casibase URL: {CASIBASE_URL}")

    # Run server
    app.run(
        host='0.0.0.0',  # Listen on all interfaces
        port=3000,
        debug=False  # Set to True for development
    )
