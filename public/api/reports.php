<?php

declare(strict_types=1);

/**
 * FixMyCampus REST API - Reports Endpoint
 * Fetches defect tickets with relational metadata (category, location, reporter).
 */

require_once dirname(__DIR__, 2) . '/src/config/app.php';
require_once SRC_PATH . '/Core/Database.php';
require_once SRC_PATH . '/Core/Response.php';
require_once SRC_PATH . '/helpers/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $statusFilter   = $_GET['status'] ?? null;
    $priorityFilter = $_GET['priority'] ?? null;
    $limit          = min((int)($_GET['limit'] ?? 20), 100);

    $sql = "
        SELECT 
            r.id,
            r.ticket_number,
            r.title,
            r.description,
            r.priority,
            r.status,
            r.specific_area,
            r.reported_at,
            r.updated_at,
            c.id AS category_id,
            c.name AS category_name,
            c.icon AS category_icon,
            c.sla_hours,
            b.id AS building_id,
            b.code AS building_code,
            b.name AS building_name,
            l.id AS location_id,
            l.name AS location_name,
            l.room_number,
            u.id AS reporter_id,
            u.full_name AS reporter_name,
            u.email AS reporter_email
        FROM `reports` r
        LEFT JOIN `categories` c ON r.category_id = c.id
        LEFT JOIN `locations` l ON r.location_id = l.id
        LEFT JOIN `buildings` b ON l.building_id = b.id
        LEFT JOIN `users` u ON r.reporter_id = u.id
        WHERE 1=1
    ";

    $params = [];

    if ($statusFilter) {
        $sql .= " AND r.status = :status";
        $params[':status'] = $statusFilter;
    }

    if ($priorityFilter) {
        $sql .= " AND r.priority = :priority";
        $params[':priority'] = $priorityFilter;
    }

    $sql .= " ORDER BY r.reported_at DESC LIMIT " . $limit;

    $reports = db_fetch_all($sql, $params);

    \FixMyCampus\Core\Response::json([
        'success' => true,
        'count'   => count($reports),
        'data'    => $reports,
    ]);
} catch (\Throwable $e) {
    \FixMyCampus\Core\Response::json([
        'success' => false,
        'error'   => $e->getMessage(),
    ], 500);
}
