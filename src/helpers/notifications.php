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
        string $message
    ): void {
        try {
            $users = db_fetch_all("
                SELECT id FROM `users`
                WHERE `role_id` IN (1, 2) AND `status` = 'active'
            ");
            foreach ($users as $u) {
                create_notification((int)$u['id'], $reportId, $type, $title, $message);
            }
        } catch (\Throwable $e) {
            error_log('[FixMyCampus Notifications] Broadcast error: ' . $e->getMessage());
        }
    }
}
