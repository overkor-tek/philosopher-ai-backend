/**
 * PM2 Ecosystem Configuration
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 start ecosystem.config.js --env production
 */

module.exports = {
  apps: [
    {
      name: 'philosopher-backend',
      script: 'server.js',
      instances: 'max',  // Use all CPU cores
      exec_mode: 'cluster',

      // Auto-restart on crash
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',

      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Health monitoring
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000
    },
    {
      name: 'health-monitor',
      script: 'monitoring/health-check.js',
      instances: 1,
      autorestart: true,
      watch: false,

      env: {
        NODE_ENV: 'development',
        API_URL: 'http://localhost:3001'
      },
      env_production: {
        NODE_ENV: 'production',
        API_URL: 'https://your-production-url.com'
      }
    }
  ]
};
