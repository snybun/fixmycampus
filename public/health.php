<?php

require_once __DIR__ . '/../src/Core/Env.php';
require_once __DIR__ . '/../src/Core/Database.php';
require_once __DIR__ . '/../src/Core/Response.php';

use FixMyCampus\Core\Env;
use FixMyCampus\Core\Database;
use FixMyCampus\Core\Response;

// Load environment variables if .env exists
Env::load(__DIR__ . '/../.env');

header('Content-Type: application/json; charset=utf-8');

$dbStatus = Database::testConnection();
$isHealthy = ($dbStatus['status'] === 'connected');

$payload = [
    'app'         => Env::get('APP_NAME', 'FixMyCampus'),
    'tagline'     => Env::get('APP_TAGLINE', 'Report. Track. Improve.'),
    'environment' => Env::get('APP_ENV', 'development'),
    'status'      => $isHealthy ? 'healthy' : 'unhealthy',
    'timestamp'   => gmdate('Y-m-d\TH:i:s\Z'),
    'php_version' => PHP_VERSION,
    'database'    => $dbStatus,
];

Response::json($payload, $isHealthy ? 200 : 503);
