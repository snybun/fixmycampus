<?php

require_once __DIR__ . '/../src/Core/Env.php';
require_once __DIR__ . '/../src/Core/Database.php';

use FixMyCampus\Core\Env;
use FixMyCampus\Core\Database;

// Load environment variables
Env::load(__DIR__ . '/../.env');

$appName = Env::get('APP_NAME', 'FixMyCampus');
$appTagline = Env::get('APP_TAGLINE', 'Report. Track. Improve.');
$appEnv = Env::get('APP_ENV', 'development');

$dbStatus = Database::testConnection();
$isConnected = ($dbStatus['status'] === 'connected');

// Query table row counts if connected
$tableStats = [];
if ($isConnected) {
    try {
        $pdo = Database::getConnection();
        $tables = $dbStatus['tables'] ?? [];
        foreach ($tables as $tbl) {
            $stmt = $pdo->query("SELECT COUNT(*) as count FROM `{$tbl}`");
            $tableStats[$tbl] = (int)$stmt->fetchColumn();
        }
    } catch (\Throwable $e) {
        // Fallback silently if table query fails
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($appName) ?> &bull; Backend &amp; Database Environment</title>
    <style>
        :root {
            --bg: #0f172a;
            --surface: #1e293b;
            --border: #334155;
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --accent: #3b82f6;
            --success: #10b981;
            --danger: #ef4444;
            --warning: #f59e0b;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg);
            color: var(--text-primary);
            line-height: 1.6;
            padding: 2.5rem 1rem;
        }
        .container {
            max-width: 960px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 2.5rem;
        }
        .header h1 {
            font-size: 2.5rem;
            font-weight: 800;
            letter-spacing: -0.025em;
            background: linear-gradient(135deg, #60a5fa 0%, #a855f7 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.5rem;
        }
        .header .tagline {
            font-size: 1.15rem;
            color: var(--text-secondary);
            font-weight: 500;
        }
        .badge-phase {
            display: inline-block;
            margin-top: 0.75rem;
            padding: 0.35rem 0.85rem;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            background: rgba(59, 130, 246, 0.15);
            color: #60a5fa;
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 9999px;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
        }
        .card-title {
            font-size: 1rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-secondary);
            margin-bottom: 1rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .status-pill {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            padding: 0.25rem 0.65rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 700;
        }
        .status-ok { background: rgba(16, 185, 129, 0.2); color: #34d399; }
        .status-err { background: rgba(239, 68, 68, 0.2); color: #f87171; }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
        .info-list { list-style: none; }
        .info-list li {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            font-size: 0.9rem;
        }
        .info-list li:last-child { border-bottom: none; }
        .info-list .label { color: var(--text-secondary); }
        .info-list .value { font-weight: 600; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        .table-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 0.75rem;
            margin-top: 1rem;
        }
        .table-item {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 0.75rem 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .table-item .name { font-size: 0.85rem; font-family: monospace; color: #cbd5e1; }
        .table-item .count { font-size: 0.85rem; font-weight: 700; color: #60a5fa; }
        .endpoints {
            margin-top: 1rem;
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }
        .btn-link {
            display: inline-block;
            padding: 0.5rem 1rem;
            background: var(--surface);
            color: #60a5fa;
            border: 1px solid var(--border);
            border-radius: 6px;
            text-decoration: none;
            font-size: 0.85rem;
            font-weight: 600;
            transition: all 0.2s;
        }
        .btn-link:hover {
            border-color: #60a5fa;
            background: rgba(59, 130, 246, 0.1);
        }
        .notice {
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.25);
            border-radius: 8px;
            padding: 1rem 1.25rem;
            font-size: 0.9rem;
            color: #93c5fd;
            margin-top: 2rem;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1><?= htmlspecialchars($appName) ?></h1>
            <p class="tagline">&ldquo;<?= htmlspecialchars($appTagline) ?>&rdquo;</p>
            <span class="badge-phase">Phase 1 &bull; Database &amp; Environment Setup</span>
        </header>

        <div class="grid">
            <!-- Server Card -->
            <div class="card">
                <div class="card-title">
                    <span>Application Runtime</span>
                    <span class="status-pill status-ok"><span class="dot"></span> Active</span>
                </div>
                <ul class="info-list">
                    <li><span class="label">PHP Version</span><span class="value"><?= PHP_VERSION ?></span></li>
                    <li><span class="label">SAPI</span><span class="value"><?= PHP_SAPI ?></span></li>
                    <li><span class="label">Environment</span><span class="value"><?= htmlspecialchars($appEnv) ?></span></li>
                    <li><span class="label">PDO Drivers</span><span class="value"><?= implode(', ', PDO::getAvailableDrivers()) ?></span></li>
                </ul>
            </div>

            <!-- Database Card -->
            <div class="card">
                <div class="card-title">
                    <span>Database Engine</span>
                    <?php if ($isConnected): ?>
                        <span class="status-pill status-ok"><span class="dot"></span> Connected</span>
                    <?php else: ?>
                        <span class="status-pill status-err"><span class="dot"></span> Offline</span>
                    <?php endif; ?>
                </div>
                <ul class="info-list">
                    <li><span class="label">Database Name</span><span class="value"><?= htmlspecialchars(Env::get('DB_DATABASE', 'fixmycampus_db')) ?></span></li>
                    <li><span class="label">Host &amp; Port</span><span class="value"><?= htmlspecialchars(Env::get('DB_HOST', 'database') . ':' . Env::get('DB_PORT', 3306)) ?></span></li>
                    <li><span class="label">Server Ver.</span><span class="value"><?= htmlspecialchars($dbStatus['server_version'] ?? 'N/A') ?></span></li>
                    <li><span class="label">Tables Loaded</span><span class="value"><?= count($tableStats) ?> tables</span></li>
                </ul>
            </div>
        </div>

        <!-- Tables Overview -->
        <div class="card">
            <div class="card-title">
                <span>Database Schema &amp; Seed Overview (<?= count($tableStats) ?> Tables)</span>
            </div>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
                Relational tables initialized from <code>database/init/01_schema.sql</code> and <code>database/init/02_seed.sql</code>:
            </p>
            <?php if (!empty($tableStats)): ?>
                <div class="table-grid">
                    <?php foreach ($tableStats as $name => $count): ?>
                        <div class="table-item">
                            <span class="name"><?= htmlspecialchars($name) ?></span>
                            <span class="count"><?= $count ?> rows</span>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php else: ?>
                <p style="color: var(--warning); font-size: 0.9rem;">
                    Database connection pending initialization. Start the containers using <code>docker compose up -d --build</code> to auto-populate schema and seed records.
                </p>
            <?php endif; ?>

            <div class="endpoints">
                <a href="/health.php" class="btn-link" target="_blank">&rarr; JSON Health Check Endpoint (/health.php)</a>
            </div>
        </div>

        <div class="notice">
            <strong>Phase 1 Complete:</strong> Database architecture, seed migrations, Docker container orchestration, and backend PDO connection foundation are configured. Frontend UI implementation will commence in Phase 2.
        </div>
    </div>
</body>
</html>
