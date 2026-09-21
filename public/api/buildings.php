<?php

declare(strict_types=1);

/**
 * FixMyCampus REST API - Buildings & Facilities Endpoint
 * Returns campus structures, floors, and specific rooms.
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
    $buildings = db_fetch_all("
        SELECT id, code, name, description 
        FROM `buildings` 
        WHERE `is_active` = 1 
        ORDER BY name ASC
    ");

    $locations = db_fetch_all("
        SELECT l.id, l.building_id, l.room_number, l.name, l.type, b.name as building_name 
        FROM `locations` l
        JOIN `buildings` b ON l.building_id = b.id
        WHERE l.is_active = 1
        ORDER BY l.name ASC
    ");

    \FixMyCampus\Core\Response::json([
        'success'   => true,
        'buildings' => $buildings,
        'locations' => $locations,
    ]);
} catch (\Throwable $e) {
    \FixMyCampus\Core\Response::json([
        'success' => false,
        'error'   => $e->getMessage(),
    ], 500);
}
