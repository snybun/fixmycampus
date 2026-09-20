<?php

declare(strict_types=1);

/**
 * FixMyCampus REST API - Categories Endpoint
 * Returns active issue categories and target SLA resolution hours.
 */

require_once dirname(__DIR__, 2) . '/src/config/app.php';
require_once SRC_PATH . '/Core/Database.php';
require_once SRC_PATH . '/Core/Response.php';
require_once SRC_PATH . '/helpers/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $categories = db_fetch_all("
        SELECT id, name, slug, description, icon, sla_hours 
        FROM `categories` 
        WHERE `is_active` = 1 
        ORDER BY name ASC
    ");

    \FixMyCampus\Core\Response::json([
        'success' => true,
        'count'   => count($categories),
        'data'    => $categories,
    ]);
} catch (\Throwable $e) {
    \FixMyCampus\Core\Response::json([
        'success' => false,
        'error'   => $e->getMessage(),
    ], 500);
}
