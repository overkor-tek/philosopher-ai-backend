// ================================================
// ANALYTICS SYSTEM ROUTES
// ================================================
// API endpoints for viewing endpoint analytics
// C1 Mechanic - Autonomous Production Enhancement
// ================================================

const express = require('express');
const router = express.Router();
const { getAnalyticsSummary, getEndpointStats } = require('../middleware/analytics');

// Middleware to require admin access
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({
      error: 'Admin access required',
      code: 'ADMIN_ONLY',
    });
  }
  next();
}

// ================================================
// GET /analytics-system/summary
// Get overall analytics summary
// ================================================

router.get('/summary', requireAdmin, (req, res) => {
  try {
    const summary = getAnalyticsSummary();
    res.json(summary);
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ error: 'Failed to get analytics summary' });
  }
});

// ================================================
// GET /analytics-system/endpoint/:method/:path
// Get detailed stats for specific endpoint
// ================================================

router.get('/endpoint/:method/*', requireAdmin, (req, res) => {
  try {
    const method = req.params.method.toUpperCase();
    const path = '/' + req.params[0]; // Get rest of path

    const stats = getEndpointStats(method, path);

    if (!stats) {
      return res.status(404).json({
        error: 'No data found for this endpoint',
        endpoint: `${method} ${path}`,
      });
    }

    res.json(stats);
  } catch (error) {
    console.error('Endpoint stats error:', error);
    res.status(500).json({ error: 'Failed to get endpoint stats' });
  }
});

// ================================================
// GET /analytics-system/dashboard
// HTML dashboard for viewing analytics
// ================================================

router.get('/dashboard', requireAdmin, (req, res) => {
  const summary = getAnalyticsSummary();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Analytics Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        .header {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }

        .header h1 {
            color: #667eea;
            font-size: 32px;
            margin-bottom: 10px;
        }

        .header p {
            color: #666;
            font-size: 14px;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }

        .stat-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .stat-label {
            color: #999;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }

        .stat-value {
            color: #333;
            font-size: 32px;
            font-weight: bold;
        }

        .stat-sub {
            color: #666;
            font-size: 14px;
            margin-top: 5px;
        }

        .section {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }

        .section h2 {
            color: #667eea;
            font-size: 24px;
            margin-bottom: 20px;
            border-bottom: 2px solid #f0f0f0;
            padding-bottom: 10px;
        }

        .table {
            width: 100%;
            border-collapse: collapse;
        }

        .table th {
            background: #f8f9fa;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #333;
            border-bottom: 2px solid #e9ecef;
        }

        .table td {
            padding: 12px;
            border-bottom: 1px solid #f0f0f0;
        }

        .table tr:hover {
            background: #f8f9fa;
        }

        .endpoint {
            font-family: 'Courier New', monospace;
            font-size: 13px;
            color: #667eea;
        }

        .method {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
            margin-right: 8px;
        }

        .method-get { background: #4caf50; color: white; }
        .method-post { background: #2196f3; color: white; }
        .method-put { background: #ff9800; color: white; }
        .method-patch { background: #9c27b0; color: white; }
        .method-delete { background: #f44336; color: white; }

        .error-badge {
            background: #f44336;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
        }

        .success-badge {
            background: #4caf50;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
        }

        .refresh-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            margin-top: 20px;
        }

        .refresh-btn:hover {
            background: #5568d3;
        }

        @media (max-width: 768px) {
            .stats-grid {
                grid-template-columns: 1fr;
            }

            .table {
                font-size: 12px;
            }

            .table th,
            .table td {
                padding: 8px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>API Analytics Dashboard</h1>
            <p>Real-time monitoring and performance analytics for all API endpoints</p>
            <p><strong>Last Updated:</strong> ${summary.timestamp}</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Uptime</div>
                <div class="stat-value">${summary.uptime.formatted}</div>
                <div class="stat-sub">${summary.uptime.seconds} seconds</div>
            </div>

            <div class="stat-card">
                <div class="stat-label">Total Requests</div>
                <div class="stat-value">${summary.requests.total}</div>
                <div class="stat-sub">All time</div>
            </div>

            <div class="stat-card">
                <div class="stat-label">Error Rate</div>
                <div class="stat-value">${summary.requests.errorRate}</div>
                <div class="stat-sub">${summary.requests.errors} errors</div>
            </div>

            <div class="stat-card">
                <div class="stat-label">Avg Response Time</div>
                <div class="stat-value">${summary.requests.avgDuration}</div>
                <div class="stat-sub">${summary.requests.slowRequests} slow requests</div>
            </div>
        </div>

        <div class="section">
            <h2>Top Endpoints</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>Endpoint</th>
                        <th>Requests</th>
                        <th>Avg Time</th>
                        <th>Min / Max</th>
                        <th>Error Rate</th>
                        <th>Last Accessed</th>
                    </tr>
                </thead>
                <tbody>
                    ${summary.topEndpoints.map(ep => {
                      const [method, ...pathParts] = ep.endpoint.split(' ');
                      const path = pathParts.join(' ');
                      const methodClass = `method-${method.toLowerCase()}`;
                      return `
                        <tr>
                            <td>
                                <span class="method ${methodClass}">${method}</span>
                                <span class="endpoint">${path}</span>
                            </td>
                            <td><strong>${ep.count}</strong></td>
                            <td>${ep.avgDuration}ms</td>
                            <td>${ep.minDuration}ms / ${ep.maxDuration}ms</td>
                            <td>
                                ${ep.errorRate > 0
                                  ? `<span class="error-badge">${ep.errorRate.toFixed(1)}%</span>`
                                  : `<span class="success-badge">0%</span>`
                                }
                            </td>
                            <td>${new Date(ep.lastAccessed).toLocaleString()}</td>
                        </tr>
                      `;
                    }).join('')}
                </tbody>
            </table>
        </div>

        ${summary.recentErrors.length > 0 ? `
        <div class="section">
            <h2>Recent Errors (Last 20)</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Endpoint</th>
                        <th>Status</th>
                        <th>Error Code</th>
                        <th>Duration</th>
                        <th>User ID</th>
                    </tr>
                </thead>
                <tbody>
                    ${summary.recentErrors.map(err => {
                      const [method, ...pathParts] = err.endpoint.split(' ');
                      const path = pathParts.join(' ');
                      const methodClass = `method-${method.toLowerCase()}`;
                      return `
                        <tr>
                            <td>${new Date(err.timestamp).toLocaleTimeString()}</td>
                            <td>
                                <span class="method ${methodClass}">${method}</span>
                                <span class="endpoint">${path}</span>
                            </td>
                            <td><span class="error-badge">${err.statusCode}</span></td>
                            <td>${err.errorCode}</td>
                            <td>${err.duration}ms</td>
                            <td>${err.userId || 'N/A'}</td>
                        </tr>
                      `;
                    }).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        <button class="refresh-btn" onclick="location.reload()">Refresh Data</button>
    </div>
</body>
</html>
  `;

  res.send(html);
});

module.exports = router;
