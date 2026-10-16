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
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

session_start_safe();

try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Only Super Administrators can register new maintenance staff personnel
        $adminUser = auth_require_role('admin');
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
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
                    WHERE ra.assigned_to = u.id 
                      AND ra.status IN ('pending', 'accepted', 'in_progress')
                ) AS active_jobs,
                (
                    SELECT COUNT(*) 
                    FROM `report_assignments` ra 
                    WHERE ra.assigned_to = u.id 
                      AND ra.status = 'in_progress'
                ) AS in_progress_jobs,
                (
                    SELECT COUNT(*) 
                    FROM `report_assignments` ra 
                    WHERE ra.assigned_to = u.id 
                      AND ra.status = 'pending'
                ) AS pending_jobs,
                (
                    SELECT COUNT(*) 
                    FROM `report_assignments` ra 
                    WHERE ra.assigned_to = u.id 
                      AND ra.status = 'completed'
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
                ra.status AS assignment_status,
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
                WHERE ra.assigned_to = u.id 
                  AND ra.status IN ('pending', 'accepted', 'in_progress')
            ) AS active_jobs,
            (
                SELECT COUNT(*) 
                FROM `report_assignments` ra 
                WHERE ra.assigned_to = u.id 
                  AND ra.status = 'in_progress'
            ) AS in_progress_jobs,
            (
                SELECT COUNT(*) 
                FROM `report_assignments` ra 
                WHERE ra.assigned_to = u.id 
                  AND ra.status = 'pending'
            ) AS pending_jobs,
            (
                SELECT COUNT(*) 
                FROM `report_assignments` ra 
                WHERE ra.assigned_to = u.id 
                  AND ra.status = 'completed'
            ) AS completed_jobs
        FROM `users` u
        JOIN `roles` r ON u.role_id = r.id
        WHERE r.name IN ('technician', 'supervisor')
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
