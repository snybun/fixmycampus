<?php

declare(strict_types=1);

/**
 * FixMyCampus REST API - Staff Endpoint
 * Retrieves real maintenance personnel and supervisors from the database.
 * Supports adding staff members directly to MySQL.
 */

require_once dirname(__DIR__, 2) . '/src/config/app.php';
require_once SRC_PATH . '/Core/Database.php';
require_once SRC_PATH . '/Core/Response.php';
require_once SRC_PATH . '/helpers/session.php';
require_once SRC_PATH . '/helpers/auth.php';
require_once SRC_PATH . '/helpers/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

session_start_safe();
require_once SRC_PATH . '/helpers/history_logs.php';

try {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $action = $_GET['action'] ?? ($input['action'] ?? 'list');

    // --------------------------------------------------------------------------
    // ACTION: REMOVE / DELETE MAINTENANCE STAFF MEMBER
    // --------------------------------------------------------------------------
    if ($action === 'delete' || $action === 'remove' || $_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $adminUser = auth_require_role('admin');
        $staffId = (int)($input['staff_id'] ?? ($input['id'] ?? ($_GET['id'] ?? 0)));
        $reason = trim($input['reason'] ?? 'Resignation');
        $notes = trim($input['notes'] ?? '');

        if ($staffId <= 0) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Valid Staff ID is required.'
            ], 400);
        }

        if ($staffId === (int)$adminUser['id']) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'You cannot remove your own administrator account.'
            ], 400);
        }

        $staff = db_fetch_one("
            SELECT u.id, u.full_name, u.email, u.user_identifier, u.department, u.role_id, r.name AS role_name
            FROM `users` u
            JOIN `roles` r ON u.role_id = r.id
            WHERE u.id = :id
        ", [':id' => $staffId]);

        if (!$staff) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Staff member not found.'
            ], 404);
        }

        if (!in_array($staff['role_name'], ['technician', 'supervisor'], true)) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Selected user is not a maintenance staff member.'
            ], 400);
        }

        $pdo = \FixMyCampus\Core\Database::getConnection();
        $pdo->beginTransaction();

        try {
            // Find active/pending assignments for this technician
            $activeAssignments = db_fetch_all("
                SELECT ra.id, ra.report_id, ra.status AS assignment_status, r.ticket_number, r.status AS report_status
                FROM `report_assignments` ra
                JOIN `reports` r ON ra.report_id = r.id
                WHERE ra.assigned_to = :staff_id
                  AND ra.status IN ('pending', 'accepted', 'in_progress')
            ", [':staff_id' => $staffId]);

            // Unassign active work orders and return non-resolved reports to under_review
            foreach ($activeAssignments as $assignment) {
                db_execute("DELETE FROM `report_assignments` WHERE id = :ra_id", [':ra_id' => $assignment['id']]);

                if (!in_array($assignment['report_status'], ['resolved', 'closed', 'archived'], true)) {
                    db_execute("UPDATE `reports` SET `status` = 'under_review', `updated_at` = NOW() WHERE id = :rid", [
                        ':rid' => $assignment['report_id']
                    ]);

                    db_execute("
                        INSERT INTO `report_status_history` (`report_id`, `changed_by`, `previous_status`, `new_status`, `remarks`)
                        VALUES (:rid, :changed_by, :prev, 'under_review', :remarks)
                    ", [
                        ':rid'        => $assignment['report_id'],
                        ':changed_by' => $adminUser['id'],
                        ':prev'       => $assignment['report_status'],
                        ':remarks'    => "Unassigned: Personnel {$staff['full_name']} removed ({$reason}). Ticket returned for reassignment."
                    ]);
                }
            }

            // Clean up notifications for this staff member
            db_execute("DELETE FROM `notifications` WHERE user_id = :uid", [':uid' => $staffId]);

            // Check if user has historical records that must be preserved
            $hasCompletions = (int)db_fetch_column(
                "SELECT COUNT(*) FROM `repair_completions` WHERE completed_by = :uid",
                [':uid' => $staffId]
            );
            $hasStatusHistory = (int)db_fetch_column(
                "SELECT COUNT(*) FROM `report_status_history` WHERE changed_by = :uid",
                [':uid' => $staffId]
            );
            $hasRemainingAssignments = (int)db_fetch_column(
                "SELECT COUNT(*) FROM `report_assignments` WHERE assigned_to = :uid",
                [':uid' => $staffId]
            );

            if ($hasCompletions > 0 || $hasStatusHistory > 0 || $hasRemainingAssignments > 0) {
                // Soft delete: mark inactive to maintain historical relational integrity
                db_execute("UPDATE `users` SET `status` = 'inactive', `updated_at` = NOW() WHERE id = :id", [
                    ':id' => $staffId
                ]);
            } else {
                // Hard delete: clean up safely
                db_execute("DELETE FROM `users` WHERE id = :id", [':id' => $staffId]);
            }

            $pdo->commit();

            // Record history log
            if (function_exists('record_history_log')) {
                record_history_log(
                    'staff_removed',
                    "Maintenance Staff Removed: {$staff['full_name']}",
                    "Staff personnel {$staff['full_name']} ({$staff['user_identifier']}, {$staff['department']}) was removed by Administrator. Circumstance: {$reason}" . (!empty($notes) ? " - Notes: {$notes}" : ""),
                    (int)$adminUser['id'],
                    null,
                    $adminUser['full_name'] ?? 'Administrator',
                    'admin',
                    $staff['department'] ?? 'Physical Plant',
                    [
                        'staff_id'        => $staffId,
                        'staff_name'      => $staff['full_name'],
                        'user_identifier' => $staff['user_identifier'],
                        'reason'          => $reason,
                        'notes'           => $notes,
                        'unassigned_jobs' => count($activeAssignments),
                    ]
                );
            }

            \FixMyCampus\Core\Response::json([
                'success' => true,
                'message' => "Staff member {$staff['full_name']} removed successfully.",
                'unassigned_jobs_count' => count($activeAssignments)
            ]);
            exit;
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    // --------------------------------------------------------------------------
    // ACTION: REGISTER NEW MAINTENANCE STAFF MEMBER
    // --------------------------------------------------------------------------
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Only Super Administrators can register new maintenance staff personnel
        $adminUser = auth_require_role('admin');
        $name = trim($input['full_name'] ?? '');
        $email = trim($input['email'] ?? '');
        $department = trim($input['department'] ?? 'General Maintenance');
        $phone = trim($input['phone_number'] ?? '');
        $roleId = (int)($input['role_id'] ?? 3); // 3 = technician, 2 = supervisor

        if (empty($name) || empty($email)) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Full Name and Email are required.'
            ], 400);
        }

        // Generate unique identifier
        $existingCount = (int)db_fetch_column("SELECT COUNT(*) FROM `users` WHERE role_id = :rid", [':rid' => $roleId]);
        $prefix = ($roleId === 2) ? 'MGT' : 'TEC';
        $identifier = sprintf('%s-%03d', $prefix, $existingCount + 1);

        $defaultPassword = password_hash('Worker@1234', PASSWORD_BCRYPT);

        db_execute("
            INSERT INTO `users` (`role_id`, `user_identifier`, `full_name`, `email`, `password_hash`, `phone_number`, `department`, `status`)
            VALUES (:role_id, :identifier, :full_name, :email, :password, :phone, :department, 'active')
        ", [
            ':role_id'    => $roleId,
            ':identifier' => $identifier,
            ':full_name'  => $name,
            ':email'      => $email,
            ':password'   => $defaultPassword,
            ':phone'      => $phone,
            ':department' => $department
        ]);

        $newId = db_last_insert_id();

        // Record history log for new staff
        if (function_exists('record_history_log')) {
            record_history_log(
                'user_registration',
                "New Maintenance Personnel Added: {$name}",
                "{$name} ({$identifier}) added to {$department} staff.",
                (int)$adminUser['id'],
                null,
                $adminUser['full_name'] ?? 'Administrator',
                'admin',
                $department,
                [
                    'staff_id'        => $newId,
                    'user_identifier' => $identifier,
                    'email'           => $email,
                    'role_id'         => $roleId,
                ]
            );
        }

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'message' => "Staff member {$name} added successfully.",
            'staff'   => [
                'id'              => $newId,
                'user_identifier' => $identifier,
                'full_name'       => $name,
                'email'           => $email,
                'department'      => $department,
                'phone_number'    => $phone,
                'status'          => 'active',
                'active_jobs'     => 0,
                'completed_jobs'  => 0
            ]
        ], 201);
        exit;
    }

    // GET Request: check if specific staff member statistics requested
    $currentUser = auth_require_role(['admin', 'supervisor', 'technician']);
    $action = $_GET['action'] ?? 'list';

    // --------------------------------------------------------------------------
    // ACTION: STATS / DETAIL FOR A SPECIFIC STAFF MEMBER
    // --------------------------------------------------------------------------
    if ($action === 'stats' || $action === 'detail') {
        $staffId = (int)($_GET['id'] ?? 0);
        if ($staffId <= 0) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Valid Staff ID is required.'
            ], 400);
        }

        $member = db_fetch_one("
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
                r.display_name AS role_display,
                (
                    SELECT COUNT(*) 
                    FROM `report_assignments` ra 
                    WHERE ra.assigned_to = u.id
                ) AS total_jobs,
                (
                    SELECT COUNT(*) 
                    FROM `report_assignments` ra 
                    JOIN `reports` rep ON ra.report_id = rep.id
                    WHERE ra.assigned_to = u.id 
                      AND ra.status IN ('pending', 'accepted', 'in_progress')
                      AND rep.status NOT IN ('resolved', 'closed', 'archived', 'rejected')
                ) AS active_jobs,
                (
                    SELECT COUNT(*) 
                    FROM `report_assignments` ra 
                    JOIN `reports` rep ON ra.report_id = rep.id
                    WHERE ra.assigned_to = u.id 
                      AND (ra.status = 'in_progress' OR rep.status = 'in_progress')
                      AND rep.status NOT IN ('resolved', 'closed', 'archived', 'rejected')
                ) AS in_progress_jobs,
                (
                    SELECT COUNT(*) 
                    FROM `report_assignments` ra 
                    JOIN `reports` rep ON ra.report_id = rep.id
                    WHERE ra.assigned_to = u.id 
                      AND ra.status = 'pending'
                      AND rep.status NOT IN ('resolved', 'closed', 'archived', 'rejected', 'in_progress')
                ) AS pending_jobs,
                (
                    SELECT COUNT(*) 
                    FROM `report_assignments` ra 
                    JOIN `reports` rep ON ra.report_id = rep.id
                    WHERE ra.assigned_to = u.id 
                      AND (ra.status = 'completed' OR rep.status IN ('resolved', 'closed'))
                ) AS completed_jobs
            FROM `users` u
            JOIN `roles` r ON u.role_id = r.id
            WHERE u.id = :id
            LIMIT 1
        ", [':id' => $staffId]);

        if (!$member) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Staff member not found.'
            ], 404);
        }

        $member['total_jobs']       = (int)$member['total_jobs'];
        $member['active_jobs']      = (int)$member['active_jobs'];
        $member['in_progress_jobs'] = (int)$member['in_progress_jobs'];
        $member['pending_jobs']     = (int)$member['pending_jobs'];
        $member['completed_jobs']   = (int)$member['completed_jobs'];
        $member['completion_rate']  = $member['total_jobs'] > 0
            ? (int)round(($member['completed_jobs'] / $member['total_jobs']) * 100)
            : 0;

        // Fetch assigned ticket job details
        $jobs = db_fetch_all("
            SELECT 
                ra.id AS assignment_id,
                CASE 
                    WHEN r.status IN ('resolved', 'closed') THEN 'completed'
                    WHEN r.status = 'in_progress' THEN 'in_progress'
                    WHEN r.status = 'assigned' THEN 'accepted'
                    ELSE ra.status 
                END AS assignment_status,
                ra.assigned_at,
                ra.assignment_notes,
                r.id AS report_id,
                r.ticket_number,
                r.title,
                r.description,
                r.priority,
                r.status AS report_status,
                r.reported_at AS report_created_at,
                b.name AS building_name,
                l.name AS location_name,
                c.name AS category_name
            FROM `report_assignments` ra
            JOIN `reports` r ON ra.report_id = r.id
            LEFT JOIN `locations` l ON r.location_id = l.id
            LEFT JOIN `buildings` b ON l.building_id = b.id
            LEFT JOIN `categories` c ON r.category_id = c.id
            WHERE ra.assigned_to = :staff_id
            ORDER BY ra.assigned_at DESC
        ", [':staff_id' => $staffId]);

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'staff'   => $member,
            'jobs'    => $jobs,
            'metrics' => [
                'total_jobs'       => $member['total_jobs'],
                'active_jobs'      => $member['active_jobs'],
                'in_progress_jobs' => $member['in_progress_jobs'],
                'pending_jobs'     => $member['pending_jobs'],
                'completed_jobs'   => $member['completed_jobs'],
                'completion_rate'  => $member['completion_rate'],
            ]
        ]);
    }

    // --------------------------------------------------------------------------
    // ACTION: LIST ALL MAINTENANCE STAFF
    // --------------------------------------------------------------------------
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
            r.name AS role_name,
            r.display_name AS role_display,
            (
                SELECT COUNT(*) 
                FROM `report_assignments` ra 
                WHERE ra.assigned_to = u.id
            ) AS total_jobs,
            (
                SELECT COUNT(*) 
                FROM `report_assignments` ra 
                JOIN `reports` rep ON ra.report_id = rep.id
                WHERE ra.assigned_to = u.id 
                  AND ra.status IN ('pending', 'accepted', 'in_progress')
                  AND rep.status NOT IN ('resolved', 'closed', 'archived', 'rejected')
            ) AS active_jobs,
            (
                SELECT COUNT(*) 
                FROM `report_assignments` ra 
                JOIN `reports` rep ON ra.report_id = rep.id
                WHERE ra.assigned_to = u.id 
                  AND (ra.status = 'in_progress' OR rep.status = 'in_progress')
                  AND rep.status NOT IN ('resolved', 'closed', 'archived', 'rejected')
            ) AS in_progress_jobs,
            (
                SELECT COUNT(*) 
                FROM `report_assignments` ra 
                JOIN `reports` rep ON ra.report_id = rep.id
                WHERE ra.assigned_to = u.id 
                  AND ra.status = 'pending'
                  AND rep.status NOT IN ('resolved', 'closed', 'archived', 'rejected', 'in_progress')
            ) AS pending_jobs,
            (
                SELECT COUNT(*) 
                FROM `report_assignments` ra 
                JOIN `reports` rep ON ra.report_id = rep.id
                WHERE ra.assigned_to = u.id 
                  AND (ra.status = 'completed' OR rep.status IN ('resolved', 'closed'))
            ) AS completed_jobs
        FROM `users` u
        JOIN `roles` r ON u.role_id = r.id
        WHERE r.name IN ('technician', 'supervisor')
          AND u.status = 'active'
        ORDER BY u.role_id ASC, u.full_name ASC
    ";

    $staff = db_fetch_all($sql);

    foreach ($staff as &$member) {
        $member['total_jobs']       = (int)$member['total_jobs'];
        $member['active_jobs']      = (int)$member['active_jobs'];
        $member['in_progress_jobs'] = (int)$member['in_progress_jobs'];
        $member['pending_jobs']     = (int)$member['pending_jobs'];
        $member['completed_jobs']   = (int)$member['completed_jobs'];
        $member['completion_rate']  = $member['total_jobs'] > 0
            ? (int)round(($member['completed_jobs'] / $member['total_jobs']) * 100)
            : 0;
    }
    unset($member);

    \FixMyCampus\Core\Response::json([
        'success' => true,
        'count'   => count($staff),
        'data'    => $staff
    ]);
} catch (\Throwable $e) {
    \FixMyCampus\Core\Response::json([
        'success' => false,
        'error'   => $e->getMessage()
    ], 500);
}
