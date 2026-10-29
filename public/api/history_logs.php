<?php

declare(strict_types=1);

/**
 * FixMyCampus REST API - History & Audit Logs Endpoint
 * Provides full activity tracking including user registrations, reports logged with
 * timestamp & location, maintenance status transitions, and archived defect tickets.
 * Supports pagination, search, category filtering, and log deletion.
 */

require_once dirname(__DIR__, 2) . '/src/config/app.php';
require_once SRC_PATH . '/Core/Database.php';
require_once SRC_PATH . '/Core/Response.php';
require_once SRC_PATH . '/helpers/session.php';
require_once SRC_PATH . '/helpers/auth.php';
require_once SRC_PATH . '/helpers/db.php';
require_once SRC_PATH . '/helpers/history_logs.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-User-ID');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

session_start_safe();
$action = $_GET['action'] ?? 'list';

$rawBody = file_get_contents('php://input');
$bodyData = !empty($rawBody) ? json_decode($rawBody, true) : null;
if (!is_array($bodyData)) {
    $bodyData = [];
}

// Relative time helper
function history_time_ago(string $datetime): string {
    $time = strtotime($datetime);
    if (!$time) return 'Recently';
    $diff = time() - $time;
    if ($diff < 60) return 'Just now';
    if ($diff < 3600) {
        $mins = (int) floor($diff / 60);
        return $mins === 1 ? '1 minute ago' : "{$mins} minutes ago";
    }
    if ($diff < 86400) {
        $hrs = (int) floor($diff / 3600);
        return $hrs === 1 ? '1 hour ago' : "{$hrs} hours ago";
    }
    $days = (int) floor($diff / 86400);
    return $days === 1 ? '1 day ago' : "{$days} days ago";
}

try {
    // -------------------------------------------------------------------------
    // POST /api/history_logs.php?action=delete -> Delete single log entry
    // -------------------------------------------------------------------------
    if ($action === 'delete' && ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'DELETE')) {
        $logId = (int) ($bodyData['id'] ?? $_GET['id'] ?? 0);

        if ($logId <= 0) {
            \FixMyCampus\Core\Response::json(['success' => false, 'message' => 'Valid log ID is required.'], 400);
            exit;
        }

        db_execute("DELETE FROM `history_logs` WHERE `id` = :id", [':id' => $logId]);

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'message' => 'History log entry deleted successfully.',
            'id'      => $logId,
        ]);
        exit;
    }

    // -------------------------------------------------------------------------
    // POST /api/history_logs.php?action=delete_multiple -> Delete multiple or clear
    // -------------------------------------------------------------------------
    if ($action === 'delete_multiple' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $ids = $bodyData['ids'] ?? [];
        if (is_array($ids) && !empty($ids)) {
            $sanitizedIds = array_filter(array_map('intval', $ids), fn($i) => $i > 0);
            if (!empty($sanitizedIds)) {
                $inClause = implode(',', $sanitizedIds);
                db_execute("DELETE FROM `history_logs` WHERE `id` IN ({$inClause})");
            }
        } elseif (!empty($bodyData['clear_all'])) {
            $typeFilter = $bodyData['type'] ?? 'all';
            if ($typeFilter !== 'all') {
                db_execute("DELETE FROM `history_logs` WHERE `log_type` = :t", [':t' => $typeFilter]);
            } else {
                db_execute("TRUNCATE TABLE `history_logs`");
            }
        }

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'message' => 'Selected history logs removed.',
        ]);
        exit;
    }

    // -------------------------------------------------------------------------
    // GET /api/history_logs.php -> List history logs with pagination
    // -------------------------------------------------------------------------
    ensure_history_logs_synced();

    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = max(1, min(100, (int)($_GET['limit'] ?? $_GET['per_page'] ?? 10)));
    $offset = ($page - 1) * $limit;

    $type = strtolower(trim((string)($_GET['type'] ?? 'all')));
    $search = trim((string)($_GET['search'] ?? ''));

    $where = ["1=1"];
    $params = [];

    if (!empty($type) && $type !== 'all') {
        $where[] = "hl.log_type = :log_type";
        $params[':log_type'] = $type;
        if ($type === 'report_archived') {
            $where[] = "(r.is_archived = 1 OR r.id IS NULL)";
        }
        if ($type === 'staff_removed') {
            $where[] = "(u_staff.status = 'inactive' OR u_staff.id IS NULL)";
        }
    }

    if (!empty($search)) {
        $where[] = "CONCAT_WS(' ', hl.title, hl.description, hl.actor_name, hl.location_info, r.ticket_number) LIKE :search";
        $params[':search'] = "%{$search}%";
    }

    $whereSql = implode(' AND ', $where);

    // Get total count
    $countSql = "
        SELECT COUNT(*)
        FROM `history_logs` hl
        LEFT JOIN `reports` r ON hl.report_id = r.id
        LEFT JOIN `users` u_staff ON hl.log_type = 'staff_removed' AND u_staff.id = CAST(JSON_UNQUOTE(JSON_EXTRACT(hl.metadata, '$.staff_id')) AS UNSIGNED)
        WHERE {$whereSql}
    ";
    $total = (int)db_fetch_column($countSql, $params);
    $totalPages = max(1, (int)ceil($total / $limit));

    // Get paginated data
    $dataSql = "
        SELECT 
            hl.id,
            hl.log_type,
            hl.user_id,
            hl.report_id,
            hl.actor_name,
            hl.actor_role,
            hl.title,
            hl.description,
            hl.location_info,
            hl.metadata,
            hl.created_at,
            r.ticket_number,
            r.title AS report_title,
            r.status AS report_status,
            r.priority AS report_priority,
            r.is_archived,
            u.avatar_url AS actor_avatar,
            u_staff.id AS staff_user_id,
            u_staff.full_name AS staff_user_name,
            u_staff.status AS staff_user_status,
            (SELECT file_path FROM `report_attachments` WHERE report_id = hl.report_id ORDER BY id ASC LIMIT 1) AS report_photo
        FROM `history_logs` hl
        LEFT JOIN `reports` r ON hl.report_id = r.id
        LEFT JOIN `users` u ON hl.user_id = u.id
        LEFT JOIN `users` u_staff ON hl.log_type = 'staff_removed' AND u_staff.id = CAST(JSON_UNQUOTE(JSON_EXTRACT(hl.metadata, '$.staff_id')) AS UNSIGNED)
        WHERE {$whereSql}
        ORDER BY hl.created_at DESC, hl.id DESC
        LIMIT {$limit} OFFSET {$offset}
    ";

    $rows = db_fetch_all($dataSql, $params);

    $formatted = [];
    foreach ($rows as $r) {
        $meta = !empty($r['metadata']) ? json_decode($r['metadata'], true) : null;
        $staffId = !empty($r['staff_user_id'])
            ? (int)$r['staff_user_id']
            : (isset($meta['staff_id']) ? (int)$meta['staff_id'] : null);
        $staffName = $r['staff_user_name'] ?? ($meta['staff_name'] ?? null);
        $titleText = $r['title'];
        if ($r['log_type'] === 'staff_removed') {
            $titleText = str_replace('Maintenance Staff Removed:', 'Maintenance Staff Archived:', $titleText);
        }

        $formatted[] = [
            'id'            => (int)$r['id'],
            'log_type'      => $r['log_type'],
            'user_id'       => $r['user_id'] ? (int)$r['user_id'] : null,
            'report_id'     => $r['report_id'] ? (int)$r['report_id'] : null,
            'staff_id'      => $staffId,
            'staff_name'    => $staffName,
            'staff_status'  => $r['staff_user_status'] ?? 'inactive',
            'actor_name'    => $r['actor_name'] ?: 'System',
            'actor_role'    => $r['actor_role'] ?: 'System',
            'actor_avatar'  => $r['actor_avatar'] ?: null,
            'report_photo'  => $r['report_photo'] ?: null,
            'title'         => $titleText,
            'description'   => $r['description'],
            'location_info' => $r['location_info'] ?: 'Campus',
            'ticket_number' => $r['ticket_number'] ?: ($meta['ticket_number'] ?? null),
            'report_title'  => $r['report_title'] ?: ($meta['report_title'] ?? $meta['title'] ?? null),
            'report_status' => $r['report_status'] ?: ($meta['status'] ?? null),
            'is_archived'   => (int)($r['is_archived'] ?? 0),
            'created_at'    => $r['created_at'],
            'time_ago'      => history_time_ago($r['created_at']),
            'metadata'      => $meta,
        ];
    }

    // Also calculate type summary counters
    $summary = [
        'all'               => (int)db_fetch_column("
            SELECT COUNT(*) 
            FROM `history_logs` hl 
            LEFT JOIN `reports` r ON hl.report_id = r.id 
            WHERE hl.log_type != 'report_archived' OR (r.is_archived = 1 OR r.id IS NULL)
        "),
        'user_login'        => (int)db_fetch_column("SELECT COUNT(*) FROM `history_logs` WHERE log_type = 'user_login'"),
        'user_registration' => (int)db_fetch_column("SELECT COUNT(*) FROM `history_logs` WHERE log_type = 'user_registration'"),
        'report_submitted'  => (int)db_fetch_column("SELECT COUNT(*) FROM `history_logs` WHERE log_type = 'report_submitted'"),
        'status_change'     => (int)db_fetch_column("SELECT COUNT(*) FROM `history_logs` WHERE log_type = 'status_change'"),
        'report_archived'   => (int)db_fetch_column("
            SELECT COUNT(*) 
            FROM `history_logs` hl 
            LEFT JOIN `reports` r ON hl.report_id = r.id 
            WHERE hl.log_type = 'report_archived' AND (r.is_archived = 1 OR r.id IS NULL)
        "),
        'staff_removed'     => (int)db_fetch_column("
            SELECT COUNT(*) 
            FROM `history_logs` hl 
            LEFT JOIN `users` u_staff ON u_staff.id = CAST(JSON_UNQUOTE(JSON_EXTRACT(hl.metadata, '$.staff_id')) AS UNSIGNED)
            WHERE hl.log_type = 'staff_removed' AND (u_staff.status = 'inactive' OR u_staff.id IS NULL)
        "),
    ];

    \FixMyCampus\Core\Response::json([
        'success'     => true,
        'data'        => $formatted,
        'summary'     => $summary,
        'pagination'  => [
            'total'       => $total,
            'page'        => $page,
            'limit'       => $limit,
            'total_pages' => $totalPages,
        ],
    ]);
} catch (\Throwable $e) {
    \FixMyCampus\Core\Response::json([
        'success'    => false,
        'error'      => $e->getMessage(),
        'data'       => [],
        'pagination' => ['total' => 0, 'page' => 1, 'limit' => 10, 'total_pages' => 1],
    ], 500);
}
