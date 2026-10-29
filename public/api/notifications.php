<?php

declare(strict_types=1);

/**
 * FixMyCampus REST API - Notifications Endpoint
 * Delivers real database activity notifications for reports, work orders,
 * verifications, and staff assignments.
 */

require_once dirname(__DIR__, 2) . '/src/config/app.php';
require_once SRC_PATH . '/Core/Database.php';
require_once SRC_PATH . '/Core/Response.php';
require_once SRC_PATH . '/helpers/session.php';
require_once SRC_PATH . '/helpers/auth.php';
require_once SRC_PATH . '/helpers/db.php';
require_once SRC_PATH . '/helpers/notifications.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
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

$user = auth_require();
$dashboardContext = strtolower(trim((string)($_GET['dashboard'] ?? $bodyData['dashboard'] ?? '')));

$userId = (int) $user['id'];
$isAdmin = auth_is_admin();
$isMaintenanceUser = auth_is_maintenance();
// Request parameters never determine identity or assignment access.
$assignmentCondition = $isMaintenanceUser
    ? " AND EXISTS (SELECT 1 FROM `report_assignments` ra
        WHERE ra.report_id = notifications.report_id AND ra.assigned_to = notifications.user_id)"
    : '';

// Helper for relative time formatting
function get_relative_time(string $datetime): string {
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
    // POST /api/notifications.php?action=mark_all_read -> Mark all as read
    // Strictly update only notifications belonging to this specific user
    // -------------------------------------------------------------------------
    if ($action === 'mark_all_read' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        db_execute("UPDATE `notifications` SET `is_read` = 1 WHERE `user_id` = :uid {$assignmentCondition}", [':uid' => $userId]);

        \FixMyCampus\Core\Response::json([
            'success'      => true,
            'message'      => 'All notifications marked as read.',
            'unread_count' => 0,
        ]);
        exit;
    }

    // -------------------------------------------------------------------------
    // POST /api/notifications.php?action=mark_read -> Mark single notification read
    // Strictly update only if notification belongs to this specific user
    // -------------------------------------------------------------------------
    if ($action === 'mark_read' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $notifId = (int) ($bodyData['id'] ?? $_GET['id'] ?? 0);

        if ($notifId > 0) {
            db_execute("UPDATE `notifications` SET `is_read` = 1 WHERE `id` = :id AND `user_id` = :uid {$assignmentCondition}", [
                ':id'  => $notifId,
                ':uid' => $userId,
            ]);
        }

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'message' => 'Notification marked as read.',
            'id'      => $notifId,
        ]);
        exit;
    }

    // -------------------------------------------------------------------------
    // POST /api/notifications.php?action=archive -> Soft archive single notification
    // -------------------------------------------------------------------------
    if (($action === 'archive' || $action === 'delete') && ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'DELETE' || $_SERVER['REQUEST_METHOD'] === 'PUT')) {
        $notifId = (int) ($bodyData['id'] ?? $_GET['id'] ?? 0);

        if ($notifId > 0) {
            db_execute("UPDATE `notifications` SET `is_archived` = 1 WHERE `id` = :id AND `user_id` = :uid {$assignmentCondition}", [
                ':id'  => $notifId,
                ':uid' => $userId,
            ]);
        }

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'message' => 'Notification archived.',
            'id'      => $notifId,
        ]);
        exit;
    }

    // -------------------------------------------------------------------------
    // POST /api/notifications.php?action=unarchive -> Restore single notification
    // -------------------------------------------------------------------------
    if ($action === 'unarchive' && ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT')) {
        $notifId = (int) ($bodyData['id'] ?? $_GET['id'] ?? 0);

        if ($notifId > 0) {
            db_execute("UPDATE `notifications` SET `is_archived` = 0 WHERE `id` = :id AND `user_id` = :uid {$assignmentCondition}", [
                ':id'  => $notifId,
                ':uid' => $userId,
            ]);
        }

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'message' => 'Notification restored from archive.',
            'id'      => $notifId,
        ]);
        exit;
    }

    // -------------------------------------------------------------------------
    // POST /api/notifications.php?action=archive_all -> Soft archive all notifications
    // -------------------------------------------------------------------------
    if (($action === 'archive_all' || $action === 'delete_all') && ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'DELETE' || $_SERVER['REQUEST_METHOD'] === 'PUT')) {
        db_execute("UPDATE `notifications` SET `is_archived` = 1 WHERE `user_id` = :uid AND `is_archived` = 0 {$assignmentCondition}", [':uid' => $userId]);

        \FixMyCampus\Core\Response::json([
            'success'      => true,
            'message'      => 'All notifications archived.',
            'unread_count' => 0,
            'count'        => 0,
            'data'         => [],
        ]);
        exit;
    }

    // -------------------------------------------------------------------------
    // Auto-seed real notification records for existing database tickets if table empty
    // -------------------------------------------------------------------------
    if (empty($_SESSION['notifs_cleared_' . $userId]) && empty($_COOKIE['notifs_cleared_' . $userId])) {
        $existingCount = (int)db_fetch_column("SELECT COUNT(*) FROM `notifications` WHERE `user_id` = :uid", [':uid' => $userId]);
        if ($existingCount === 0) {
            if ($isMaintenanceUser) {
                // Work order dispatch for maintenance staff
                $realReports = db_fetch_all("
                    SELECT r.*, b.name AS building_name, l.room_number, u.full_name AS reporter_name
                    FROM `reports` r
                    LEFT JOIN `locations` l ON r.location_id = l.id
                    LEFT JOIN `buildings` b ON l.building_id = b.id
                    LEFT JOIN `users` u ON r.reporter_id = u.id
                    WHERE EXISTS (SELECT 1 FROM `report_assignments` ra
                        WHERE ra.report_id = r.id AND ra.assigned_to = :uid)
                    ORDER BY r.reported_at DESC
                    LIMIT 5
                ", [':uid' => $userId]);

                foreach ($realReports as $r) {
                    $loc = "{$r['building_name']} • " . ($r['room_number'] ?: $r['specific_area'] ?: 'Campus');
                    $tNum = $r['ticket_number'] ?: "FMC-{$r['id']}";
                    create_notification(
                        $userId,
                        (int)$r['id'],
                        'work_order',
                        "New Work Order Dispatched: {$tNum} {$r['title']}",
                        "Assigned task for {$r['title']} in {$loc}. Priority: " . ucfirst($r['priority']) . "."
                    );

                    if (in_array($r['priority'], ['high', 'emergency'], true)) {
                        create_notification(
                            $userId,
                            (int)$r['id'],
                            'emergency',
                            "PRIORITY ALERT: {$tNum} - {$r['title']}",
                            "Urgent defect reported in {$loc}. Please inspect site and begin repairs."
                        );
                    }
                }
            } elseif ($isAdmin) {
                // Administrative alert for incident oversight
                $realReports = db_fetch_all("
                    SELECT r.*, b.name AS building_name, l.room_number, u.full_name AS reporter_name
                    FROM `reports` r
                    LEFT JOIN `locations` l ON r.location_id = l.id
                    LEFT JOIN `buildings` b ON l.building_id = b.id
                    LEFT JOIN `users` u ON r.reporter_id = u.id
                    ORDER BY r.reported_at DESC
                    LIMIT 5
                ");

                foreach ($realReports as $r) {
                    $loc = "{$r['building_name']} • " . ($r['room_number'] ?: $r['specific_area'] ?: 'Campus');
                    $tNum = $r['ticket_number'] ?: "FMC-{$r['id']}";
                    create_notification(
                        $userId,
                        (int)$r['id'],
                        'new_report',
                        "Defect Incident Logged: {$tNum} {$r['title']}",
                        "Submitted by {$r['reporter_name']} in {$loc}. Current status: " . ucfirst($r['status']) . "."
                    );

                    if (in_array($r['priority'], ['high', 'emergency'], true)) {
                        create_notification(
                            $userId,
                            (int)$r['id'],
                            'emergency',
                            "High Priority Alert: {$tNum} in {$loc}",
                            "Requires immediate technician dispatch and facilities supervision."
                        );
                    }
                }
            } else {
                // Student / reporter updates: strictly for reports submitted or confirmed by this student
                $realReports = db_fetch_all("
                    SELECT r.*, b.name AS building_name, l.room_number, u.full_name AS reporter_name
                    FROM `reports` r
                    LEFT JOIN `locations` l ON r.location_id = l.id
                    LEFT JOIN `buildings` b ON l.building_id = b.id
                    LEFT JOIN `users` u ON r.reporter_id = u.id
                    WHERE r.reporter_id = :uid OR r.id IN (SELECT report_id FROM `report_confirmations` WHERE user_id = :cuid)
                    ORDER BY r.reported_at DESC
                    LIMIT 5
                ", [':uid' => $userId, ':cuid' => $userId]);

                foreach ($realReports as $r) {
                    $loc = "{$r['building_name']} • " . ($r['room_number'] ?: $r['specific_area'] ?: 'Campus');
                    $tNum = $r['ticket_number'] ?: "FMC-{$r['id']}";
                    create_notification(
                        $userId,
                        (int)$r['id'],
                        'verified',
                        "Your report {$tNum} has been received and verified.",
                        "Campus operations has reviewed '{$r['title']}' in {$loc}."
                    );

                    if ($r['status'] === 'assigned') {
                        create_notification(
                            $userId,
                            (int)$r['id'],
                            'assignment',
                            "Technician Assigned to {$tNum}",
                            "A maintenance specialist has been assigned to inspect and repair '{$r['title']}'."
                        );
                    } elseif ($r['status'] === 'in_progress') {
                        create_notification(
                            $userId,
                            (int)$r['id'],
                            'in_progress',
                            "Repair In Progress: {$tNum}",
                            "Maintenance personnel has begun repair work on '{$r['title']}'."
                        );
                    } elseif ($r['status'] === 'resolved' || $r['status'] === 'closed') {
                        create_notification(
                            $userId,
                            (int)$r['id'],
                            'verified',
                            "Issue Fixed: {$tNum} - {$r['title']}",
                            "Your reported issue has been repaired and verified."
                        );
                    }
                }
            }
        }
    }

    // -------------------------------------------------------------------------
    // GET /api/notifications.php -> List database notifications
    // -------------------------------------------------------------------------
    $includeArchived = isset($_GET['include_archived']) && ($_GET['include_archived'] === '1' || $_GET['include_archived'] === 'true');
    $filterParam = strtolower(trim((string)($_GET['filter'] ?? $bodyData['filter'] ?? '')));
    $isArchivedOnly = ($filterParam === 'archived' || (isset($_GET['is_archived']) && $_GET['is_archived'] === '1'));

    $archivedCondition = "AND (n.is_archived = 0 OR n.is_archived IS NULL)";
    if ($isArchivedOnly) {
        $archivedCondition = "AND n.is_archived = 1";
    } elseif ($includeArchived || ($isAdmin && $dashboardContext === 'admin')) {
        $archivedCondition = "";
    }

    $assignmentFilter = $isMaintenanceUser
        ? "AND EXISTS (SELECT 1 FROM `report_assignments` ra
            WHERE ra.report_id = n.report_id AND ra.assigned_to = n.user_id)"
        : '';

    $sql = "
        SELECT 
            n.id,
            n.user_id,
            n.report_id,
            n.type,
            n.title,
            n.message,
            n.is_read,
            n.is_archived,
            n.created_at,
            r.ticket_number,
            r.title AS report_title,
            r.status AS report_status,
            r.priority AS report_priority,
            b.name AS building_name,
            l.room_number,
            r.specific_area
        FROM `notifications` n
        LEFT JOIN `reports` r ON n.report_id = r.id
        LEFT JOIN `locations` l ON r.location_id = l.id
        LEFT JOIN `buildings` b ON l.building_id = b.id
        WHERE n.user_id = :uid {$archivedCondition} {$assignmentFilter}
        ORDER BY n.created_at DESC
        LIMIT 100
    ";

    $rows = db_fetch_all($sql, [
        ':uid' => $userId,
    ]);

    $notifications = [];
    foreach ($rows as $row) {
        $type = $row['type'] ?: 'info';
        $location = 'Campus Facilities';
        if (!empty($row['building_name'])) {
            $location = $row['building_name'] . ' • ' . ($row['room_number'] ?: $row['specific_area'] ?: 'Facility');
        }

        $badgeLabel = match ($type) {
            'emergency'   => 'Safety Emergency',
            'work_order'  => 'Work Order Dispatch',
            'assignment'  => 'Staff Assigned',
            'in_progress' => 'Repair In Progress',
            'verified'    => 'Issue Fixed',
            'fixed'       => 'Issue Fixed',
            'resolved'    => 'Issue Fixed',
            'parts'       => 'Parts & Requisition',
            'sla_warning' => 'SLA Notice',
            'new_report'  => 'New Defect Report',
            'submitted'   => 'Report Submitted',
            default       => 'Campus Notification',
        };

        $ticketNum = $row['ticket_number'] ?: null;
        if (!$ticketNum && preg_match('/(FMC?[-_]?[0-9A-Z]{3,})/i', $row['title'] . ' ' . $row['message'], $m)) {
            $ticketNum = strtoupper($m[1]);
        }

        $notifications[] = [
            'id'            => (int) $row['id'],
            'user_id'       => (int) $row['user_id'],
            'report_id'     => $row['report_id'] ? (int) $row['report_id'] : null,
            'ticket_number' => $ticketNum,
            'type'          => $type,
            'title'         => $row['title'],
            'message'       => $row['message'],
            'location'      => $location,
            'priority'      => $row['report_priority'] ?: ($type === 'emergency' ? 'emergency' : ($type === 'work_order' ? 'high' : 'medium')),
            'badge_label'   => $badgeLabel,
            'time_ago'      => get_relative_time($row['created_at']),
            'is_read'       => (int) $row['is_read'],
            'is_archived'   => (int) ($row['is_archived'] ?? 0),
            'created_at'    => $row['created_at'],
        ];
    }

    $unreadCount = count(array_filter($notifications, fn($n) => (int)$n['is_read'] === 0 && (int)($n['is_archived'] ?? 0) === 0));
    $archivedCount = count(array_filter($notifications, fn($n) => (int)($n['is_archived'] ?? 0) === 1));

    \FixMyCampus\Core\Response::json([
        'success'        => true,
        'unread_count'   => $unreadCount,
        'archived_count' => $archivedCount,
        'count'          => count($notifications),
        'data'           => $notifications,
    ]);
} catch (\Throwable $e) {
    \FixMyCampus\Core\Response::json([
        'success' => false,
        'error'   => $e->getMessage(),
        'unread_count' => 0,
        'count'   => 0,
        'data'    => [],
    ], 500);
}
