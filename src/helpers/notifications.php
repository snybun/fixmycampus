<?php

declare(strict_types=1);

/**
 * FixMyCampus Notification Helpers
 * Dispatches and manages in-app notifications in MySQL for all roles.
 */

require_once __DIR__ . '/db.php';

if (!function_exists('create_notification')) {
    /**
     * Insert a notification into the notifications table.
     */
    function create_notification(
        int $userId,
        ?int $reportId,
        string $type,
        string $title,
        string $message
    ): int {
        if ($userId <= 0) {
            return 0;
        }

        try {
            // Maintenance recipients only receive alerts for their current assignments.
            $recipient = db_fetch_one("
                SELECT r.name AS role_name
                FROM `users` u JOIN `roles` r ON r.id = u.role_id
                WHERE u.id = :uid
            ", [':uid' => $userId]);
            if (in_array($recipient['role_name'] ?? '', ['supervisor', 'technician'], true)) {
                if (!$reportId || !db_fetch_one("
                    SELECT id FROM `report_assignments`
                    WHERE report_id = :rid AND assigned_to = :uid LIMIT 1
                ", [':rid' => $reportId, ':uid' => $userId])) {
                    return 0;
                }
            }

            return db_insert('notifications', [
                'user_id'    => $userId,
                'report_id'  => $reportId,
                'type'       => $type,
                'title'      => mb_substr($title, 0, 150),
                'message'    => $message,
                'is_read'    => 0,
            ]);
        } catch (\Throwable $e) {
            error_log('[FixMyCampus Notifications] Error inserting notification: ' . $e->getMessage());
            return 0;
        }
    }
}

if (!function_exists('notify_admins_and_supervisors')) {
    /**
     * Broadcast notification to all active administrators and maintenance supervisors.
     */
    function notify_admins_and_supervisors(
        ?int $reportId,
        string $type,
        string $title,
        string $message,
        ?int $excludeUserId = null
    ): void {
        try {
            $users = db_fetch_all("
                SELECT id FROM `users`
                WHERE `role_id` IN (1, 2) AND `status` = 'active'
            ");
            foreach ($users as $u) {
                $uid = (int)$u['id'];
                if ($excludeUserId !== null && $uid === $excludeUserId) {
                    continue;
                }
                create_notification($uid, $reportId, $type, $title, $message);
            }
        } catch (\Throwable $e) {
            error_log('[FixMyCampus Notifications] Broadcast error: ' . $e->getMessage());
        }
    }
}
