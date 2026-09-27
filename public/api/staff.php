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

    // GET Request: fetch maintenance personnel (technicians & supervisors)
    // Strictly restricted to authorized staff/admin personnel
    $currentUser = auth_require_role(['admin', 'supervisor', 'technician']);

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
                  AND ra.status IN ('pending', 'accepted', 'in_progress')
            ) AS active_jobs,
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

    // Compute availability status badge dynamically
    foreach ($staff as &$member) {
        $member['active_jobs'] = (int)$member['active_jobs'];
        $member['completed_jobs'] = (int)$member['completed_jobs'];
        
        if ($member['status'] !== 'active') {
            $member['availability'] = 'Off Duty';
        } elseif ($member['active_jobs'] >= 2) {
            $member['availability'] = 'Busy';
        } else {
            $member['availability'] = 'Available';
        }
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
