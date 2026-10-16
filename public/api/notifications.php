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

$user = auth_user();
$paramUid = (int)($_GET['user_id'] ?? $bodyData['user_id'] ?? $_SERVER['HTTP_X_USER_ID'] ?? 0);
$dashboardContext = strtolower(trim((string)($_GET['dashboard'] ?? $bodyData['dashboard'] ?? '')));

// 1. If explicit user_id provided, look up that user in database
if ($paramUid > 0) {
    $found = db_fetch_one("
        SELECT u.*, r.name AS role_name
        FROM `users` u
        LEFT JOIN `roles` r ON u.role_id = r.id
        WHERE u.id = :id AND u.status = 'active'
        LIMIT 1
    ", [':id' => $paramUid]);
    if ($found) {
        $user = $found;
    }
}

// 2. If no user resolved yet, check session
if (!$user) {
    $sessionUser = auth_user();
    if ($sessionUser) {
        $user = $sessionUser;
    }
}

// 3. If still no user, use dashboard context to find the representative active user
if (!$user) {
    if ($dashboardContext === 'admin') {
        $found = db_fetch_one("
            SELECT u.*, r.name AS role_name
            FROM `users` u
            JOIN `roles` r ON u.role_id = r.id
            WHERE r.name = 'admin' AND u.status = 'active'
            ORDER BY u.id ASC
            LIMIT 1
        ");
        $user = $found ?: ['id' => 1, 'role_name' => 'admin', 'role_id' => 1];
    } elseif ($dashboardContext === 'maintenance') {
        $found = db_fetch_one("
            SELECT u.*, r.name AS role_name
            FROM `users` u
            JOIN `roles` r ON u.role_id = r.id
            WHERE r.name IN ('supervisor', 'technician') AND u.status = 'active'
            ORDER BY u.id ASC
            LIMIT 1
        ");
        $user = $found ?: ['id' => 17, 'role_name' => 'supervisor', 'role_id' => 2];
    } else {
        // Default to student
        $found = db_fetch_one("
            SELECT u.*, r.name AS role_name
            FROM `users` u
            JOIN `roles` r ON u.role_id = r.id
            WHERE r.name = 'student' AND u.status = 'active'
            ORDER BY u.id ASC
            LIMIT 1
        ");
        $user = $found ?: ['id' => 2, 'role_name' => 'student', 'role_id' => 5];
    }
}

$userId = (int) $user['id'];
$roleName = $user['role_name'] ?? auth_role() ?? 'student';
$roleId = (int) ($user['role_id'] ?? 5);

$isAdmin = ($roleName === 'admin' || $roleId === 1 || $dashboardContext === 'admin');
$isMaintenanceUser = (!$isAdmin && ($roleName === 'supervisor' || $roleName === 'technician' || $roleId === 2 || $roleId === 3 || $dashboardContext === 'maintenance'));

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
        db_execute("UPDATE `notifications` SET `is_read` = 1 WHERE `user_id` = :uid", [':uid' => $userId]);

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
            db_execute("UPDATE `notifications` SET `is_read` = 1 WHERE `id` = :id AND `user_id` = :uid", [
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
    // POST /api/notifications.php?action=delete -> Delete single notification
    // STRICT ISOLATION: A user can ONLY delete their own notification!
    // -------------------------------------------------------------------------
    if ($action === 'delete' && ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'DELETE')) {
        $notifId = (int) ($bodyData['id'] ?? $_GET['id'] ?? 0);

        if ($notifId > 0) {
            db_execute("DELETE FROM `notifications` WHERE `id` = :id AND `user_id` = :uid", [
                ':id'  => $notifId,
                ':uid' => $userId,
            ]);

            $remaining = (int)db_fetch_column("SELECT COUNT(*) FROM `notifications` WHERE `user_id` = :uid", [':uid' => $userId]);
            if ($remaining === 0) {
                $_SESSION['notifs_cleared_' . $userId] = true;
                setcookie('notifs_cleared_' . $userId, '1', time() + 86400 * 30, '/');
            }
        }

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'message' => 'Notification deleted.',
            'id'      => $notifId,
        ]);
        exit;
    }

    // -------------------------------------------------------------------------
    // POST /api/notifications.php?action=delete_all -> Delete all notifications
    // STRICT ISOLATION: Clearing notifications ONLY affects this specific user's inbox!
    // -------------------------------------------------------------------------
    if ($action === 'delete_all' && ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'DELETE')) {
        db_execute("DELETE FROM `notifications` WHERE `user_id` = :uid", [':uid' => $userId]);

        $_SESSION['notifs_cleared_' . $userId] = true;
        setcookie('notifs_cleared_' . $userId, '1', time() + 86400 * 30, '/');

        \FixMyCampus\Core\Response::json([
            'success'      => true,
            'message'      => 'All notifications deleted.',
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
                    ORDER BY r.reported_at DESC
                    LIMIT 5
                ");

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
    $sql = "
        SELECT 
            n.id,
            n.user_id,
            n.report_id,
            n.type,
            n.title,
            n.message,
            n.is_read,
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
        WHERE n.user_id = :uid
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
            'created_at'    => $row['created_at'],
        ];
    }

    $unreadCount = count(array_filter($notifications, fn($n) => (int)$n['is_read'] === 0));

    \FixMyCampus\Core\Response::json([
        'success'      => true,
        'unread_count' => $unreadCount,
        'count'        => count($notifications),
        'data'         => $notifications,
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
