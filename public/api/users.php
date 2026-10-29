<?php

declare(strict_types=1);

/**
 * FixMyCampus REST API - Users Management Endpoint
 * Lists and manages system users across all roles (Admin, Supervisor, Technician, Faculty, Student).
 */

require_once dirname(__DIR__, 2) . '/src/config/app.php';
require_once SRC_PATH . '/Core/Database.php';
require_once SRC_PATH . '/Core/Response.php';
require_once SRC_PATH . '/helpers/session.php';
require_once SRC_PATH . '/helpers/auth.php';
require_once SRC_PATH . '/helpers/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Strict Server-Side RBAC Enforcement: Administrator privileges required
$currentUser = auth_require_role('admin');

try {
    $roleFilter = $_GET['role'] ?? null;
    $search     = trim($_GET['search'] ?? '');

    $sql = "
        SELECT 
            u.id,
            u.role_id,
            u.user_identifier,
            u.full_name,
            u.email,
            u.phone_number,
            u.department,
            u.status,
            u.created_at,
            r.name AS role_name,
            r.display_name AS role_display
        FROM `users` u
        JOIN `roles` r ON u.role_id = r.id
        -- Removed maintenance staff remain inactive for historical references.
        -- Match the Maintenance Staff roster while keeping other account statuses visible.
        WHERE (r.name NOT IN ('technician', 'supervisor') OR u.status = 'active')
    ";

    $params = [];

    if (!empty($roleFilter) && $roleFilter !== 'all') {
        $sql .= " AND r.name = :role";
        $params[':role'] = $roleFilter;
    }

    if (!empty($search)) {
        $sql .= " AND CONCAT_WS(' ', u.user_identifier, u.full_name, u.email, u.department) LIKE :search";
        $params[':search'] = "%{$search}%";
    }

    $sql .= " ORDER BY u.role_id ASC, u.full_name ASC";

    $users = db_fetch_all($sql, $params);

    \FixMyCampus\Core\Response::json([
        'success' => true,
        'count'   => count($users),
        'data'    => $users,
    ]);
} catch (\Throwable $e) {
    \FixMyCampus\Core\Response::json([
        'success' => false,
        'error'   => $e->getMessage(),
    ], 500);
}
