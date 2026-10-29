<?php

declare(strict_types=1);

/**
 * FixMyCampus History & Audit Logging Helpers
 * Records and tracks events for user registrations, report submissions,
 * status changes, and report archiving.
 */

require_once __DIR__ . '/db.php';

if (!function_exists('record_history_log')) {
    /**
     * Record a system history/audit log entry.
     */
    function record_history_log(
        string $logType,
        string $title,
        ?string $description = null,
        ?int $userId = null,
        ?int $reportId = null,
        ?string $actorName = null,
        ?string $actorRole = null,
        ?string $locationInfo = null,
        ?array $metadata = null,
        ?string $createdAt = null
    ): int {
        try {
            $data = [
                'log_type'      => $logType,
                'title'         => mb_substr($title, 0, 250),
                'description'   => $description,
                'user_id'       => $userId ?: null,
                'report_id'     => $reportId ?: null,
                'actor_name'    => $actorName ?: null,
                'actor_role'    => $actorRole ?: null,
                'location_info' => $locationInfo ?: null,
                'metadata'      => !empty($metadata) ? json_encode($metadata) : null,
            ];

            if ($createdAt !== null) {
                $data['created_at'] = $createdAt;
            }

            return db_insert('history_logs', $data);
        } catch (\Throwable $e) {
            error_log('[FixMyCampus HistoryLogs] Error inserting log: ' . $e->getMessage());
            return 0;
        }
    }
}

if (!function_exists('ensure_history_logs_synced')) {
    /**
     * Synchronize past user registrations, reports, and status updates into history_logs
     * if the history_logs table is currently empty.
     */
    function ensure_history_logs_synced(): void {
        try {
            // Ensure table exists with VARCHAR(50) log_type
            db_query("CREATE TABLE IF NOT EXISTS `history_logs` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `log_type` VARCHAR(50) NOT NULL,
                `user_id` INT UNSIGNED DEFAULT NULL,
                `report_id` INT UNSIGNED DEFAULT NULL,
                `actor_name` VARCHAR(150) DEFAULT NULL,
                `actor_role` VARCHAR(50) DEFAULT NULL,
                `title` VARCHAR(255) NOT NULL,
                `description` TEXT DEFAULT NULL,
                `location_info` VARCHAR(255) DEFAULT NULL,
                `metadata` JSON DEFAULT NULL,
                `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                KEY `idx_history_type` (`log_type`),
                KEY `idx_history_user` (`user_id`),
                KEY `idx_history_report` (`report_id`),
                KEY `idx_history_created` (`created_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            try {
                db_query("ALTER TABLE `history_logs` MODIFY COLUMN `log_type` VARCHAR(50) NOT NULL");
            } catch (\Throwable $t) {}

            $count = (int)db_fetch_column("SELECT COUNT(*) FROM `history_logs`");

            // Clean up any unarchived report records that might have stale report_archived logs
            db_execute("DELETE hl FROM `history_logs` hl INNER JOIN `reports` r ON hl.report_id = r.id WHERE hl.log_type = 'report_archived' AND (r.is_archived = 0 OR r.is_archived IS NULL)");

            // Clean up any active staff records that might have stale staff_removed logs
            try {
                db_execute("
                    DELETE hl FROM `history_logs` hl
                    INNER JOIN `users` u ON u.id = CAST(JSON_UNQUOTE(JSON_EXTRACT(hl.metadata, '$.staff_id')) AS UNSIGNED)
                    WHERE hl.log_type = 'staff_removed' AND u.status = 'active'
                ");
            } catch (\Throwable $t) {}

            // Backfill staff_removed logs for any currently inactive maintenance workers missing an archive log
            try {
                $inactiveWorkers = db_fetch_all("
                    SELECT u.id, u.user_identifier, u.full_name, u.email, u.department, u.updated_at, u.created_at
                    FROM `users` u
                    WHERE u.role_id IN (2, 3) AND u.status = 'inactive'
                ");
                foreach ($inactiveWorkers as $iw) {
                    $existingLog = db_fetch_one("
                        SELECT id FROM `history_logs`
                        WHERE log_type = 'staff_removed'
                          AND CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.staff_id')) AS UNSIGNED) = :sid
                        LIMIT 1
                    ", [':sid' => (int)$iw['id']]);
                    if (!$existingLog) {
                        record_history_log(
                            'staff_removed',
                            "Maintenance Staff Archived: {$iw['full_name']}",
                            "Staff personnel {$iw['full_name']} ({$iw['user_identifier']}, {$iw['department']}) was archived by Administrator.",
                            1,
                            null,
                            'Campus Administrator',
                            'Administrator',
                            $iw['department'] ?: 'Physical Plant',
                            [
                                'staff_id'        => (int)$iw['id'],
                                'staff_name'      => $iw['full_name'],
                                'email'           => $iw['email'],
                                'user_identifier' => $iw['user_identifier'],
                                'department'      => $iw['department'],
                                'reason'          => 'Archived',
                            ],
                            $iw['updated_at'] ?: $iw['created_at']
                        );
                    }
                }
            } catch (\Throwable $t) {}

            // If there are existing logs, check if we need to backfill initial user_login entries
            if ($count > 0) {
                $loginCount = (int)db_fetch_column("SELECT COUNT(*) FROM `history_logs` WHERE log_type = 'user_login'");
                if ($loginCount === 0) {
                    $activeUsers = db_fetch_all("
                        SELECT u.id, u.user_identifier, u.full_name, u.email, u.department, u.created_at, r.name AS role_name
                        FROM `users` u
                        LEFT JOIN `roles` r ON u.role_id = r.id
                        WHERE u.status = 'active'
                        ORDER BY u.id ASC
                        LIMIT 5
                    ");
                    foreach ($activeUsers as $au) {
                        $roleLabel = ucfirst($au['role_name'] ?? 'User');
                        record_history_log(
                            'user_login',
                            "User Signed In: {$au['full_name']} ({$roleLabel})",
                            "{$au['full_name']} ({$au['email']}) signed in successfully.",
                            (int)$au['id'],
                            null,
                            $au['full_name'],
                            $roleLabel,
                            $au['department'] ?: 'PHINMA University of Pangasinan',
                            [
                                'email'           => $au['email'],
                                'user_identifier' => $au['user_identifier'],
                                'role'            => $au['role_name'],
                                'method'          => 'password',
                            ],
                            $au['created_at']
                        );
                    }
                }
                return;
            }

            // 1. Back-populate registered users ("users that signed")
            $users = db_fetch_all("
                SELECT u.id, u.user_identifier, u.first_name, u.middle_name, u.last_name, 
                       u.full_name, u.email, u.department, u.created_at, r.name AS role_name
                FROM `users` u
                LEFT JOIN `roles` r ON u.role_id = r.id
                ORDER BY u.created_at ASC
            ");

            foreach ($users as $u) {
                $roleLabel = ucfirst($u['role_name'] ?? 'User');
                $deptInfo = $u['department'] ? " • Department: {$u['department']}" : '';
                $idInfo = $u['user_identifier'] ? " • ID: {$u['user_identifier']}" : '';

                record_history_log(
                    'user_registration',
                    "User Registration: {$u['full_name']} ({$roleLabel})",
                    "New account created for {$u['full_name']} ({$u['email']}){$idInfo}{$deptInfo}.",
                    (int)$u['id'],
                    null,
                    $u['full_name'],
                    $roleLabel,
                    $u['department'] ?: 'PHINMA University of Pangasinan',
                    [
                        'email'           => $u['email'],
                        'user_identifier' => $u['user_identifier'],
                        'role'            => $u['role_name'],
                        'department'      => $u['department'],
                    ],
                    $u['created_at']
                );
            }

            // 2. Back-populate incident defect reports ("when or where is it reported")
            $reports = db_fetch_all("
                SELECT r.id, r.ticket_number, r.title, r.description, r.priority, r.status,
                       r.reported_at, r.is_archived, r.archived_at, r.specific_area,
                       b.name AS building_name, l.room_number,
                       c.name AS category_name,
                       u.id AS reporter_id, u.full_name AS reporter_name, u.user_identifier AS reporter_identifier
                FROM `reports` r
                LEFT JOIN `locations` l ON r.location_id = l.id
                LEFT JOIN `buildings` b ON l.building_id = b.id
                LEFT JOIN `categories` c ON r.category_id = c.id
                LEFT JOIN `users` u ON r.reporter_id = u.id
                ORDER BY r.reported_at ASC
            ");

            foreach ($reports as $r) {
                $location = trim(($r['building_name'] ?? 'Campus') . ' • ' . ($r['room_number'] ?: $r['specific_area'] ?: 'General Area'));
                $reporter = $r['reporter_name'] ?? 'Campus Reporter';
                $tNum = $r['ticket_number'] ?: "FMC-{$r['id']}";

                record_history_log(
                    'report_submitted',
                    "Incident Reported: {$tNum} - {$r['title']}",
                    "Submitted by {$reporter} (" . ($r['reporter_identifier'] ?: 'ID N/A') . ") with " . ucfirst($r['priority']) . " priority. Category: {$r['category_name']}. Description: {$r['description']}",
                    (int)($r['reporter_id'] ?? 0),
                    (int)$r['id'],
                    $reporter,
                    'Reporter',
                    $location,
                    [
                        'ticket_number' => $tNum,
                        'category'      => $r['category_name'],
                        'priority'      => $r['priority'],
                        'status'        => $r['status'],
                        'location'      => $location,
                    ],
                    $r['reported_at']
                );

                if (!empty($r['is_archived'])) {
                    record_history_log(
                        'report_archived',
                        "Report Archived: {$tNum} - {$r['title']}",
                        "Incident {$tNum} was archived and stored in permanent history.",
                        1,
                        (int)$r['id'],
                        'Campus Administrator',
                        'Administrator',
                        $location,
                        [
                            'ticket_number' => $tNum,
                            'title'         => $r['title'],
                            'archived_at'   => $r['archived_at'],
                        ],
                        $r['archived_at'] ?: date('Y-m-d H:i:s')
                    );
                }
            }

            // 3. Back-populate status transition logs
            $transitions = db_fetch_all("
                SELECT sh.id, sh.report_id, sh.previous_status, sh.new_status, sh.remarks, sh.created_at,
                       u.full_name AS actor_name, r.ticket_number, r.title AS report_title,
                       b.name AS building_name, l.room_number, r.specific_area
                FROM `report_status_history` sh
                LEFT JOIN `users` u ON sh.changed_by = u.id
                LEFT JOIN `reports` r ON sh.report_id = r.id
                LEFT JOIN `locations` l ON r.location_id = l.id
                LEFT JOIN `buildings` b ON l.building_id = b.id
                ORDER BY sh.created_at ASC
            ");

            foreach ($transitions as $sh) {
                if (empty($sh['report_title'])) continue;
                $location = trim(($sh['building_name'] ?? 'Campus') . ' • ' . ($sh['room_number'] ?: $sh['specific_area'] ?: 'General Area'));
                $tNum = $sh['ticket_number'] ?: "FMC-{$sh['report_id']}";
                $actor = $sh['actor_name'] ?: 'System / Administrator';
                $prev = $sh['previous_status'] ? ucfirst(str_replace('_', ' ', $sh['previous_status'])) : 'New';
                $next = ucfirst(str_replace('_', ' ', $sh['new_status']));

                record_history_log(
                    'status_change',
                    "Status Update: {$tNum} ({$next})",
                    "Status updated from {$prev} to {$next} by {$actor}. Remarks: " . ($sh['remarks'] ?: 'No additional remarks'),
                    null,
                    (int)$sh['report_id'],
                    $actor,
                    'Staff / Administrator',
                    $location,
                    [
                        'ticket_number'   => $tNum,
                        'previous_status' => $sh['previous_status'],
                        'new_status'      => $sh['new_status'],
                        'remarks'         => $sh['remarks'],
                    ],
                    $sh['created_at']
                );
            }

            // 4. Back-populate initial user sign-ins
            $activeUsers = db_fetch_all("
                SELECT u.id, u.user_identifier, u.full_name, u.email, u.department, u.created_at, r.name AS role_name
                FROM `users` u
                LEFT JOIN `roles` r ON u.role_id = r.id
                WHERE u.status = 'active'
                ORDER BY u.created_at ASC
                LIMIT 5
            ");
            foreach ($activeUsers as $au) {
                $roleLabel = ucfirst($au['role_name'] ?? 'User');
                record_history_log(
                    'user_login',
                    "User Signed In: {$au['full_name']} ({$roleLabel})",
                    "{$au['full_name']} ({$au['email']}) signed in successfully.",
                    (int)$au['id'],
                    null,
                    $au['full_name'],
                    $roleLabel,
                    $au['department'] ?: 'PHINMA University of Pangasinan',
                    [
                        'email'           => $au['email'],
                        'user_identifier' => $au['user_identifier'],
                        'role'            => $au['role_name'],
                        'method'          => 'password',
                    ],
                    $au['created_at']
                );
            }
        } catch (\Throwable $e) {
            error_log('[FixMyCampus HistoryLogs] Sync error: ' . $e->getMessage());
        }
    }
}
