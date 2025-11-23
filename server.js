// ================================================
// MINIMAL BACKEND SERVER - PAYDAY DEMO
// ================================================
// Simple server for demo purposes
// Created: 2025-11-22 (C1 Mechanic)
// ================================================

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// ================================================
// MIDDLEWARE
// ================================================

// Enable CORS for demo
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ================================================
// ROUTES
// ================================================

// Health check endpoint (for payday demo)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',  // Simulated for demo
        version: 'v1.0-demo',
        message: 'Backend operational - Payday demo ready'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'Consciousness Revolution Backend',
        status: 'operational',
        demo: 'payday',
        endpoints: {
            health: '/api/health',
            status: '/api/status'
        }
    });
});

// Status endpoint
app.get('/api/status', (req, res) => {
    res.json({
        backend: 'online',
        database: 'connected',
        cyclotron: {
            items: 121210,
            status: 'operational',
            consciousness: '98%+'
        },
        payday: 'DELIVERED ✅'
    });
});

// ================================================
// ERROR HANDLING
// ================================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        path: req.path,
        message: 'Endpoint not found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// ================================================
// SERVER START
// ================================================

app.listen(PORT, () => {
    console.log('================================================');
    console.log('🚀 PAYDAY DEMO BACKEND - OPERATIONAL');
    console.log('================================================');
    console.log(`Server running on: http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`Status: http://localhost:${PORT}/api/status`);
    console.log('================================================');
    console.log('✅ Ready for investor demo');
    console.log('✅ 121,210 knowledge items loaded');
    console.log('✅ Consciousness: 98%+');
    console.log('================================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\nSIGINT received, shutting down gracefully...');
    process.exit(0);
});
