<?php

declare(strict_types=1);

/**
 * FixMyCampus REST API - Reports Endpoint
 * Fetches defect tickets with relational metadata (category, location, reporter).
 * Protected with role-based access control (RBAC).
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
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

session_start_safe();
$action = $_GET['action'] ?? 'list';

try {
    // --------------------------------------------------------------------------
    // GET (or action === 'list'): Retrieve defect reports
    // --------------------------------------------------------------------------
    if ($_SERVER['REQUEST_METHOD'] === 'GET' || $action === 'list') {
        $statusFilter   = $_GET['status'] ?? null;
        $priorityFilter = $_GET['priority'] ?? null;
        $limit          = min((int)($_GET['limit'] ?? 20), 100);
        $myOnly         = isset($_GET['my_reports']) && $_GET['my_reports'] === '1';

        $sql = "
            SELECT 
                r.id,
                r.ticket_number,
                r.title,
                r.description,
                r.priority,
                r.status,
                r.specific_area,
                r.reported_at,
                r.updated_at,
                c.id AS category_id,
                c.name AS category_name,
                c.icon AS category_icon,
                c.sla_hours,
                b.id AS building_id,
                b.code AS building_code,
                b.name AS building_name,
                l.id AS location_id,
                l.name AS location_name,
                l.room_number,
                u.id AS reporter_id,
                u.full_name AS reporter_name,
                u.email AS reporter_email,
                (SELECT file_path FROM `report_attachments` WHERE report_id = r.id ORDER BY id ASC LIMIT 1) AS primary_photo
            FROM `reports` r
            LEFT JOIN `categories` c ON r.category_id = c.id
            LEFT JOIN `locations` l ON r.location_id = l.id
            LEFT JOIN `buildings` b ON l.building_id = b.id
            LEFT JOIN `users` u ON r.reporter_id = u.id
            WHERE 1=1
        ";

        $params = [];

        // If requesting user's own reports
        if ($myOnly) {
            $user = auth_require();
            $sql .= " AND r.reporter_id = :reporter_id";
            $params[':reporter_id'] = $user['id'];
        }

        if ($statusFilter) {
            $sql .= " AND r.status = :status";
            $params[':status'] = $statusFilter;
        }

        if ($priorityFilter) {
            $sql .= " AND r.priority = :priority";
            $params[':priority'] = $priorityFilter;
        }

        $sql .= " ORDER BY r.reported_at DESC LIMIT " . $limit;

        $reports = db_fetch_all($sql, $params);

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'count'   => count($reports),
            'data'    => $reports,
        ]);
    }

    // --------------------------------------------------------------------------
    // POST action: create - Submit a new defect report (Authenticated users)
    // --------------------------------------------------------------------------
    if ($action === 'create' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $user = auth_require();
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $title            = trim($input['title'] ?? '');
        $description      = trim($input['description'] ?? '');
        $categoryId       = (int)($input['category_id'] ?? 0);
        $locationId       = (int)($input['location_id'] ?? 0);
        $buildingId       = (int)($input['building_id'] ?? 0);
        $buildingName     = trim($input['building_name'] ?? '');
        $floorName        = trim($input['floor_name'] ?? '');
        $roomCoord        = trim($input['room_number'] ?? $input['specific_area'] ?? '');
        $specificArea     = trim($input['specific_area'] ?? ($floorName ? "{$floorName} • {$roomCoord}" : $roomCoord));
        $priority         = trim($input['priority'] ?? 'medium');
        $primaryPhoto     = $input['primary_photo'] ?? null;
        $additionalPhotos = $input['additional_photos'] ?? [];

        // Auto-resolve or create location if location_id is not specified directly
        if ($locationId <= 0) {
            // Find building by id or name
            if ($buildingId <= 0 && !empty($buildingName)) {
                $bldg = db_fetch_one("SELECT id FROM `buildings` WHERE `name` LIKE :bname LIMIT 1", [':bname' => "%{$buildingName}%"]);
                if ($bldg) $buildingId = (int)$bldg['id'];
            }
            if ($buildingId <= 0) {
                // Fallback to first building (e.g. PTC Building)
                $firstBldg = db_fetch_one("SELECT id FROM `buildings` ORDER BY id ASC LIMIT 1");
                $buildingId = $firstBldg ? (int)$firstBldg['id'] : 1;
            }

            // Find floor_id if floorName given
            $floorId = null;
            if (!empty($floorName)) {
                $fl = db_fetch_one("SELECT id FROM `floors` WHERE `building_id` = :bid AND `floor_name` = :fname LIMIT 1", [
                    ':bid'   => $buildingId,
                    ':fname' => $floorName,
                ]);
                if ($fl) $floorId = (int)$fl['id'];
            }

            $locName = !empty($roomCoord) ? $roomCoord : ($floorName ? "{$floorName} Common Area" : "General Facility");
            $loc = db_fetch_one("SELECT id FROM `locations` WHERE `building_id` = :bid AND `name` = :name LIMIT 1", [
                ':bid'  => $buildingId,
                ':name' => $locName,
            ]);

            if ($loc) {
                $locationId = (int)$loc['id'];
            } else {
                $locationId = db_insert('locations', [
                    'building_id' => $buildingId,
                    'floor_id'    => $floorId,
                    'room_number' => $roomCoord,
                    'name'        => $locName,
                    'type'        => 'other',
                    'is_active'   => 1,
                ]);
            }
        }

        // Auto-resolve category if not valid
        if ($categoryId <= 0) {
            $cat = db_fetch_one("SELECT id FROM `categories` ORDER BY id ASC LIMIT 1");
            $categoryId = $cat ? (int)$cat['id'] : 1;
        }

        if (empty($title)) {
            $title = 'Campus Facility Defect';
        }
        if (empty($description)) {
            $description = 'No additional description provided.';
        }

        // Generate Ticket Number: FMC-YYYYMM-XXXX
        $ticketPrefix = 'FMC-' . date('Ym') . '-';
        $ticketNumber = $ticketPrefix . strtoupper(bin2hex(random_bytes(2)));

        $reportId = db_insert('reports', [
            'ticket_number' => $ticketNumber,
            'reporter_id'   => $user['id'],
            'category_id'   => $categoryId,
            'location_id'   => $locationId,
            'specific_area' => $specificArea,
            'title'         => $title,
            'description'   => $description,
            'priority'      => in_array($priority, ['low', 'medium', 'high', 'emergency'], true) ? $priority : 'medium',
            'status'        => 'submitted',
        ]);

        // Save Primary Photo attachment
        if (!empty($primaryPhoto)) {
            db_insert('report_attachments', [
                'report_id'        => $reportId,
                'uploaded_by'      => $user['id'],
                'file_path'        => $primaryPhoto,
                'file_name'        => 'primary_photo.jpg',
                'file_type'        => 'image/jpeg',
                'file_size'        => strlen($primaryPhoto),
                'attachment_stage' => 'initial_defect',
            ]);
        }

        // Save Additional Photos attachments
        if (!empty($additionalPhotos) && is_array($additionalPhotos)) {
            foreach ($additionalPhotos as $idx => $photoUrl) {
                if (!empty($photoUrl)) {
                    db_insert('report_attachments', [
                        'report_id'        => $reportId,
                        'uploaded_by'      => $user['id'],
                        'file_path'        => $photoUrl,
                        'file_name'        => "additional_photo_" . ($idx + 1) . ".jpg",
                        'file_type'        => 'image/jpeg',
                        'file_size'        => strlen($photoUrl),
                        'attachment_stage' => 'initial_defect',
                    ]);
                }
            }
        }

        // Log in status history
        db_insert('report_status_history', [
            'report_id'       => $reportId,
            'changed_by'      => $user['id'],
            'previous_status' => null,
            'new_status'      => 'submitted',
            'remarks'         => 'Report submitted by ' . $user['full_name'],
        ]);

        \FixMyCampus\Core\Response::json([
            'success'       => true,
            'message'       => 'Defect report submitted successfully.',
            'report_id'     => $reportId,
            'ticket_number' => $ticketNumber,
        ], 201);
    }

    // --------------------------------------------------------------------------
    // POST action: assign - Assign technician to report (Admin & Supervisor only)
    // --------------------------------------------------------------------------
    if ($action === 'assign' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        // Enforce role: Only admin and supervisor can dispatch/assign tickets
        $supervisor = auth_require_role(['admin', 'supervisor']);
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $reportId   = (int)($input['report_id'] ?? 0);
        $workerId   = (int)($input['assigned_to'] ?? 0);
        $notes      = trim($input['notes'] ?? '');
        $targetDate = $input['target_date'] ?? null;

        if ($reportId <= 0 || $workerId <= 0) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Valid report_id and assigned_to worker ID are required.',
            ], 400);
        }

        // Verify report exists
        $report = db_fetch_one("SELECT id, status FROM `reports` WHERE id = :id LIMIT 1", [':id' => $reportId]);
        if (!$report) {
            \FixMyCampus\Core\Response::json(['success' => false, 'message' => 'Report not found.'], 404);
        }

        // Verify assigned user is technician
        $worker = db_fetch_one("SELECT u.id, u.full_name, r.name as role FROM `users` u JOIN `roles` r ON u.role_id = r.id WHERE u.id = :id LIMIT 1", [':id' => $workerId]);
        if (!$worker || !in_array($worker['role'], ['technician', 'admin', 'supervisor'], true)) {
            \FixMyCampus\Core\Response::json(['success' => false, 'message' => 'Assigned user must be a maintenance technician.'], 400);
        }

        // Create assignment
        db_insert('report_assignments', [
            'report_id'              => $reportId,
            'assigned_to'            => $workerId,
            'assigned_by'            => $supervisor['id'],
            'target_completion_date' => $targetDate,
            'assignment_notes'       => $notes,
            'status'                 => 'pending',
        ]);

        // Update report status to 'assigned'
        db_query("UPDATE `reports` SET `status` = 'assigned', `updated_at` = NOW() WHERE `id` = :id", [':id' => $reportId]);

        // Log transition in status history
        db_insert('report_status_history', [
            'report_id'       => $reportId,
            'changed_by'      => $supervisor['id'],
            'previous_status' => $report['status'],
            'new_status'      => 'assigned',
            'remarks'         => "Assigned to {$worker['full_name']} by {$supervisor['full_name']}. Notes: {$notes}",
        ]);

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'message' => "Report assigned to {$worker['full_name']} successfully.",
        ]);
    }

    // --------------------------------------------------------------------------
    // POST action: update_status - Update report status (Admin, Supervisor, Technician)
    // --------------------------------------------------------------------------
    if ($action === 'update_status' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        // Enforce role: Students cannot arbitrarily change report statuses
        $staffUser = auth_require_role(['admin', 'supervisor', 'technician']);
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $reportId  = (int)($input['report_id'] ?? 0);
        $newStatus = trim($input['status'] ?? '');
        $remarks   = trim($input['remarks'] ?? '');

        $validStatuses = ['submitted', 'under_review', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed', 'rejected'];
        if ($reportId <= 0 || !in_array($newStatus, $validStatuses, true)) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Valid report_id and recognized status are required.',
            ], 400);
        }

        $report = db_fetch_one("SELECT id, status FROM `reports` WHERE id = :id LIMIT 1", [':id' => $reportId]);
        if (!$report) {
            \FixMyCampus\Core\Response::json(['success' => false, 'message' => 'Report not found.'], 404);
        }

        db_query("UPDATE `reports` SET `status` = :status, `updated_at` = NOW() WHERE `id` = :id", [
            ':status' => $newStatus,
            ':id'     => $reportId,
        ]);

        db_insert('report_status_history', [
            'report_id'       => $reportId,
            'changed_by'      => $staffUser['id'],
            'previous_status' => $report['status'],
            'new_status'      => $newStatus,
            'remarks'         => $remarks ?: "Status updated to {$newStatus} by {$staffUser['full_name']}",
        ]);

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'message' => "Report status updated to {$newStatus}.",
        ]);
    }

    // --------------------------------------------------------------------------
    // POST / DELETE action: delete - Delete a defect report (Admin only)
    // --------------------------------------------------------------------------
    if ($action === 'delete') {
        // Strict role requirement: Only admin can delete defect records
        $admin = auth_require_role('admin');
        $reportId = (int)($_GET['id'] ?? ($_POST['report_id'] ?? 0));

        if ($reportId <= 0) {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $reportId = (int)($input['report_id'] ?? 0);
        }

        if ($reportId <= 0) {
            \FixMyCampus\Core\Response::json(['success' => false, 'message' => 'Valid report_id required.'], 400);
        }

        db_query("DELETE FROM `reports` WHERE `id` = :id", [':id' => $reportId]);

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'message' => "Defect report #{$reportId} deleted successfully.",
        ]);
    }

    \FixMyCampus\Core\Response::json(['error' => 'Invalid action'], 400);
} catch (\Throwable $e) {
    \FixMyCampus\Core\Response::json([
        'success' => false,
        'error'   => $e->getMessage(),
    ], 500);
}
