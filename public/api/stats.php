<?php

declare(strict_types=1);

/**
 * FixMyCampus REST API - Stats Endpoint
 * Returns aggregated defect ticket metrics and database connection health.
 */

require_once dirname(__DIR__, 2) . '/src/config/app.php';
require_once SRC_PATH . '/Core/Database.php';
require_once SRC_PATH . '/Core/Response.php';
require_once SRC_PATH . '/helpers/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$payload = [
    'success'          => true,
    'db_connected'     => false,
    'db_version'       => 'N/A',
    'total_reports'    => 0,
    'pending_review'   => 0,
    'in_progress'      => 0,
    'resolved'         => 0,
    'emergency'        => 0,
    'categories_count' => 0,
    'buildings_count'  => 0,
    'tables'           => [],
    'timestamp'        => gmdate('Y-m-d\TH:i:s\Z'),
];

try {
    $dbStatus = \FixMyCampus\Core\Database::testConnection();
    if ($dbStatus['status'] === 'connected') {
        $payload['db_connected']     = true;
        $payload['db_version']       = $dbStatus['server_version'] ?? 'MySQL 8';
        $payload['tables']           = $dbStatus['tables'] ?? [];
        $payload['total_reports']    = (int) db_fetch_column("SELECT COUNT(*) FROM `reports`");
        $payload['pending_review']   = (int) db_fetch_column("SELECT COUNT(*) FROM `reports` WHERE `status` IN ('submitted', 'under_review')");
        $payload['in_progress']      = (int) db_fetch_column("SELECT COUNT(*) FROM `reports` WHERE `status` IN ('assigned', 'in_progress')");
        $payload['resolved']         = (int) db_fetch_column("SELECT COUNT(*) FROM `reports` WHERE `status` IN ('resolved', 'closed')");
        $payload['emergency']        = (int) db_fetch_column("SELECT COUNT(*) FROM `reports` WHERE `priority` = 'emergency'");
        $payload['categories_count'] = (int) db_fetch_column("SELECT COUNT(*) FROM `categories` WHERE `is_active` = 1");
        $payload['buildings_count']  = (int) db_fetch_column("SELECT COUNT(*) FROM `buildings` WHERE `is_active` = 1");
        $payload['data']             = $payload;
    }
} catch (\Throwable $e) {
    $payload['db_connected'] = false;
    $payload['error'] = $e->getMessage();
}

\FixMyCampus\Core\Response::json($payload, 200);
