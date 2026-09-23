<?php

declare(strict_types=1);

/**
 * FixMyCampus REST API - Dedicated Admin Endpoint
 * Strictly protected: Requires authenticated user with 'admin' role.
 * Non-admin roles (e.g. student, faculty) receive HTTP 403 Forbidden.
 */

require_once dirname(__DIR__, 2) . '/src/config/app.php';
require_once SRC_PATH . '/Core/Database.php';
require_once SRC_PATH . '/Core/Response.php';
require_once SRC_PATH . '/helpers/session.php';
require_once SRC_PATH . '/helpers/auth.php';
require_once SRC_PATH . '/helpers/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ==============================================================================
// STRICT SERVER-SIDE ROLE ENFORCEMENT
// ==============================================================================
$currentUser = auth_require_role('admin');

$action = $_GET['action'] ?? 'overview';

try {
    // --------------------------------------------------------------------------
    // Action: overview - Administrative dashboard statistics
    // --------------------------------------------------------------------------
    if ($action === 'overview') {
        $userCountsByRole = db_fetch_all("
            SELECT r.name AS role_name, r.display_name, COUNT(u.id) AS count
            FROM `roles` r
            LEFT JOIN `users` u ON u.role_id = r.id
            GROUP BY r.id, r.name, r.display_name
            ORDER BY r.id ASC
        ");

        $totalUsers = (int) db_fetch_column("SELECT COUNT(*) FROM `users`");
        $activeUsers = (int) db_fetch_column("SELECT COUNT(*) FROM `users` WHERE status = 'active'");
        $suspendedUsers = (int) db_fetch_column("SELECT COUNT(*) FROM `users` WHERE status = 'suspended'");
        
        $totalReports = (int) db_fetch_column("SELECT COUNT(*) FROM `reports`");
        $pendingReports = (int) db_fetch_column("SELECT COUNT(*) FROM `reports` WHERE status IN ('submitted', 'under_review')");
        $inProgressReports = (int) db_fetch_column("SELECT COUNT(*) FROM `reports` WHERE status IN ('assigned', 'in_progress')");
        $resolvedReports = (int) db_fetch_column("SELECT COUNT(*) FROM `reports` WHERE status IN ('resolved', 'closed')");

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'data'    => [
                'users' => [
                    'total'     => $totalUsers,
                    'active'    => $activeUsers,
                    'suspended' => $suspendedUsers,
                    'by_role'   => $userCountsByRole,
                ],
                'reports' => [
                    'total'       => $totalReports,
                    'pending'     => $pendingReports,
                    'in_progress' => $inProgressReports,
                    'resolved'    => $resolvedReports,
                ],
                'server' => [
                    'php_version' => PHP_VERSION,
                    'domain'      => \FixMyCampus\Core\Env::get('GOOGLE_ALLOWED_DOMAIN', 'phinmaed.com'),
                    'smtp_host'   => \FixMyCampus\Core\Env::get('SMTP_HOST', 'N/A'),
                ],
            ],
        ]);
    }

    // --------------------------------------------------------------------------
    // Action: users - Query users with filter and pagination
    // --------------------------------------------------------------------------
    if ($action === 'users') {
        $search = trim($_GET['search'] ?? '');
        $roleFilter = trim($_GET['role'] ?? '');
        $statusFilter = trim($_GET['status'] ?? '');
        $limit = min(max((int)($_GET['limit'] ?? 50), 1), 100);
        $offset = max((int)($_GET['offset'] ?? 0), 0);

        $sql = "
            SELECT 
                u.id, u.role_id, r.name as role_name, r.display_name as role_display,
                u.user_identifier, u.full_name, u.email, u.phone_number,
                u.department, u.status, u.created_at, u.updated_at
            FROM `users` u
            JOIN `roles` r ON u.role_id = r.id
            WHERE 1=1
        ";
        $params = [];

        if (!empty($search)) {
            $sql .= " AND (u.full_name LIKE :search OR u.email LIKE :search OR u.user_identifier LIKE :search)";
            $params[':search'] = '%' . $search . '%';
        }

        if (!empty($roleFilter)) {
            $sql .= " AND r.name = :role";
            $params[':role'] = $roleFilter;
        }

        if (!empty($statusFilter)) {
            $sql .= " AND u.status = :status";
            $params[':status'] = $statusFilter;
        }

        $sql .= " ORDER BY u.created_at DESC LIMIT {$limit} OFFSET {$offset}";

        $users = db_fetch_all($sql, $params);
        $totalMatching = (int) db_fetch_column("SELECT COUNT(*) FROM `users`");

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'total'   => $totalMatching,
            'count'   => count($users),
            'data'    => $users,
        ]);
    }

    // --------------------------------------------------------------------------
    // Action: update_role - Promote or change user role
    // --------------------------------------------------------------------------
    if ($action === 'update_role' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $targetUserId = (int)($input['user_id'] ?? 0);
        $newRoleId = (int)($input['role_id'] ?? 0);

        if ($targetUserId <= 0 || $newRoleId <= 0) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Valid user_id and role_id are required.',
            ], 400);
        }

        // Verify role exists
        $role = db_fetch_one("SELECT id, name, display_name FROM `roles` WHERE id = :id LIMIT 1", [':id' => $newRoleId]);
        if (!$role) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Invalid role specified.',
            ], 400);
        }

        // Prevent self-demotion from admin
        if ($targetUserId === (int)$currentUser['id'] && $role['name'] !== 'admin') {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'You cannot remove administrator privileges from your own active account.',
            ], 400);
        }

        db_query("UPDATE `users` SET `role_id` = :role_id, `updated_at` = NOW() WHERE `id` = :user_id", [
            ':role_id' => $newRoleId,
            ':user_id' => $targetUserId,
        ]);

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'message' => "User role updated successfully to {$role['display_name']}.",
        ]);
    }

    // --------------------------------------------------------------------------
    // Action: update_status - Toggle active/suspended user status
    // --------------------------------------------------------------------------
    if ($action === 'update_status' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $targetUserId = (int)($input['user_id'] ?? 0);
        $newStatus = trim($input['status'] ?? '');

        if (!in_array($newStatus, ['active', 'inactive', 'suspended'], true)) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Invalid status. Allowed values: active, inactive, suspended.',
            ], 400);
        }

        // Cannot suspend self
        if ($targetUserId === (int)$currentUser['id']) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'You cannot change the status of your own account.',
            ], 400);
        }

        db_query("UPDATE `users` SET `status` = :status, `updated_at` = NOW() WHERE `id` = :id", [
            ':status' => $newStatus,
            ':id'     => $targetUserId,
        ]);

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'message' => "User status updated to {$newStatus}.",
        ]);
    }

    // --------------------------------------------------------------------------
    // Action: audit_logs - Recent status transitions and work logs
    // --------------------------------------------------------------------------
    if ($action === 'audit_logs') {
        $limit = min((int)($_GET['limit'] ?? 30), 100);

        $logs = db_fetch_all("
            SELECT 
                h.id, h.report_id, h.previous_status, h.new_status, h.remarks, h.created_at,
                r.ticket_number, r.title as report_title,
                u.full_name as changed_by_name, u.email as changed_by_email,
                ro.display_name as changed_by_role
            FROM `report_status_history` h
            JOIN `reports` r ON h.report_id = r.id
            JOIN `users` u ON h.changed_by = u.id
            JOIN `roles` ro ON u.role_id = ro.id
            ORDER BY h.created_at DESC
            LIMIT {$limit}
        ");

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'count'   => count($logs),
            'data'    => $logs,
        ]);
    }

    \FixMyCampus\Core\Response::json(['error' => 'Invalid admin action'], 400);
} catch (\Throwable $e) {
    \FixMyCampus\Core\Response::json([
        'success' => false,
        'error'   => $e->getMessage(),
    ], 500);
}
