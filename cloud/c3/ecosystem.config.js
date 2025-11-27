/**
 * PM2 Ecosystem Configuration
 * CP3 C3 Cloud - Trinity Network
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 start ecosystem.config.js --only c3-cloud
 *   pm2 start ecosystem.config.js --env production
 */

module.exports = {
  apps: [
    {
      name: 'c3-cloud',
      script: './c3-cloud-sync-service.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        TRINITY_COMPUTER_ID: 'C',
        TRINITY_INSTANCE_TYPE: 'cloud',
        TRINITY_ROLE: 'C3_ORACLE',
        PORT: 3001,
        CLOUD_SYNC_INTERVAL: 30000,
        HEARTBEAT_INTERVAL: 15000,
        LOG_LEVEL: 'debug'
      },
      env_production: {
        NODE_ENV: 'production',
        TRINITY_COMPUTER_ID: 'C',
        TRINITY_INSTANCE_TYPE: 'cloud',
        TRINITY_ROLE: 'C3_ORACLE',
        PORT: 3001,
        CLOUD_SYNC_INTERVAL: 30000,
        HEARTBEAT_INTERVAL: 15000,
        LOG_LEVEL: 'info'
      },
      error_file: '../../.trinity/logs/c3-cloud-error.log',
      out_file: '../../.trinity/logs/c3-cloud-out.log',
      log_file: '../../.trinity/logs/c3-cloud-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'philosopher-backend',
      script: '../../server.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '../../logs/backend-error.log',
      out_file: '../../logs/backend-out.log',
      time: true
    }
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: ['c3-oracle.example.com'],
      ref: 'origin/main',
      repo: 'git@github.com:overkor-tek/philosopher-ai-backend.git',
      path: '/var/www/philosopher-ai',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
