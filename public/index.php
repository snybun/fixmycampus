<?php

declare(strict_types=1);

/**
 * FixMyCampus Entry Point & API Gateway
 *
 * Serves the React Single Page Application (SPA) production build,
 * or provides JSON API gateway information if accessed directly.
 */

$spaFile = __DIR__ . '/dist/index.html';
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';

// 1. Serve compiled React SPA for root and client routes
if (file_exists($spaFile) && !str_starts_with($requestUri, '/api') && !str_starts_with($requestUri, '/health.php')) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($spaFile);
    exit;
}

// 2. Load application configuration & environment
$config = require_once dirname(__DIR__) . '/src/config/app.php';

// Configure runtime error display based on environment
if ($config['debug']) {
    ini_set('display_errors', '1');
    ini_set('display_startup_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
    ini_set('display_startup_errors', '0');
    error_reporting(0);
}

// 3. Informational response when frontend bundle is missing
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'app'       => $config['name'] ?? 'FixMyCampus',
    'status'    => 'ready',
    'message'   => 'FixMyCampus API backend is running. React frontend has not been compiled yet.',
    'endpoints' => [
        'health'     => '/health.php',
        'stats'      => '/api/stats.php',
        'reports'    => '/api/reports.php',
        'categories' => '/api/categories.php',
        'buildings'  => '/api/buildings.php',
        'auth'       => '/api/auth.php',
    ],
    'instructions' => "Run 'cd frontend && npm run build' to build the React application into /public/dist.",
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
