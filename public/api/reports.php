<?php

declare(strict_types=1);

/**
 * FixMyCampus REST API - Reports Endpoint
 * Fetches defect tickets with relational metadata (category, location, reporter, assigned worker).
 * Supports search, filtering, worker assignment, status updates, and submission.
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
    // -------------------------------------------------------------------------
    // POST /api/reports.php?action=create -> Submit defect report
    // -------------------------------------------------------------------------
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
            if ($buildingId <= 0 && !empty($buildingName)) {
                $bldg = db_fetch_one("SELECT id FROM `buildings` WHERE `name` LIKE :bname LIMIT 1", [':bname' => "%{$buildingName}%"]);
                if ($bldg) $buildingId = (int)$bldg['id'];
            }
            if ($buildingId <= 0) {
                $firstBldg = db_fetch_one("SELECT id FROM `buildings` ORDER BY id ASC LIMIT 1");
                $buildingId = $firstBldg ? (int)$firstBldg['id'] : 1;
            }

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

    // -------------------------------------------------------------------------
    // POST /api/reports.php?action=assign -> Assign maintenance technician
    // -------------------------------------------------------------------------
    if ($action === 'assign' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $reportId = (int)($input['report_id'] ?? 0);
        $technicianId = (int)($input['assigned_to'] ?? 0);
        $notes = trim($input['notes'] ?? 'Assigned by Administrator');
        $assignedBy = (int)($input['assigned_by'] ?? ($_SESSION['user_id'] ?? 1));

        if ($reportId <= 0 || $technicianId <= 0) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Valid report_id and assigned_to technician ID are required.'
            ], 400);
        }

        $tech = db_fetch_one("SELECT id, full_name, email, department FROM `users` WHERE id = :id", [':id' => $technicianId]);
        if (!$tech) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Technician not found.'
            ], 404);
        }

        $report = db_fetch_one("SELECT id, status, ticket_number FROM `reports` WHERE id = :id", [':id' => $reportId]);
        if (!$report) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Report not found.'
            ], 404);
        }

        $pdo = \FixMyCampus\Core\Database::getConnection();
        $pdo->beginTransaction();

        try {
            $existingAssignment = db_fetch_one("SELECT id FROM `report_assignments` WHERE report_id = :rid", [':rid' => $reportId]);
            if ($existingAssignment) {
                db_execute("
                    UPDATE `report_assignments`
                    SET `assigned_to` = :assigned_to,
                        `assigned_by` = :assigned_by,
                        `assignment_notes` = :notes,
                        `status` = 'pending',
                        `updated_at` = NOW()
                    WHERE `id` = :id
                ", [
                    ':assigned_to' => $technicianId,
                    ':assigned_by' => $assignedBy,
                    ':notes'       => $notes,
                    ':id'          => $existingAssignment['id']
                ]);
            } else {
                db_execute("
                    INSERT INTO `report_assignments` (`report_id`, `assigned_to`, `assigned_by`, `assignment_notes`, `status`)
                    VALUES (:report_id, :assigned_to, :assigned_by, :notes, 'pending')
                ", [
                    ':report_id'   => $reportId,
                    ':assigned_to' => $technicianId,
                    ':assigned_by' => $assignedBy,
                    ':notes'       => $notes
                ]);
            }

            db_execute("UPDATE `reports` SET `status` = 'assigned', `updated_at` = NOW() WHERE `id` = :id", [':id' => $reportId]);

            db_execute("
                INSERT INTO `report_status_history` (`report_id`, `changed_by`, `previous_status`, `new_status`, `remarks`)
                VALUES (:report_id, :changed_by, :prev, 'assigned', :remarks)
            ", [
                ':report_id'   => $reportId,
                ':changed_by'  => $assignedBy,
                ':prev'        => $report['status'],
                ':remarks'     => "Assigned to {$tech['full_name']} ({$tech['department']})"
            ]);

            $pdo->commit();

            \FixMyCampus\Core\Response::json([
                'success' => true,
                'message' => "Worker {$tech['full_name']} assigned successfully.",
                'technician' => $tech,
                'status' => 'assigned'
            ]);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    // -------------------------------------------------------------------------
    // POST /api/reports.php?action=update_status -> Update report status
    // -------------------------------------------------------------------------
    if ($action === 'update_status' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $reportId = (int)($input['report_id'] ?? 0);
        $newStatus = trim($input['status'] ?? '');
        $remarks = trim($input['remarks'] ?? 'Status updated by Administrator');
        $changedBy = (int)($input['changed_by'] ?? ($_SESSION['user_id'] ?? 1));

        $allowedStatuses = ['submitted', 'under_review', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed', 'rejected'];
        if ($reportId <= 0 || !in_array($newStatus, $allowedStatuses, true)) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Invalid report_id or status value.'
            ], 400);
        }

        $report = db_fetch_one("SELECT id, status, ticket_number FROM `reports` WHERE id = :id", [':id' => $reportId]);
        if (!$report) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Report not found.'
            ], 404);
        }

        $pdo = \FixMyCampus\Core\Database::getConnection();
        $pdo->beginTransaction();

        try {
            db_execute("UPDATE `reports` SET `status` = :status, `updated_at` = NOW() WHERE `id` = :id", [
                ':status' => $newStatus,
                ':id'     => $reportId
            ]);

            db_execute("
                INSERT INTO `report_status_history` (`report_id`, `changed_by`, `previous_status`, `new_status`, `remarks`)
                VALUES (:report_id, :changed_by, :prev, :new_status, :remarks)
            ", [
                ':report_id'   => $reportId,
                ':changed_by'  => $changedBy,
                ':prev'        => $report['status'],
                ':new_status'  => $newStatus,
                ':remarks'     => $remarks
            ]);

            $pdo->commit();

            \FixMyCampus\Core\Response::json([
                'success' => true,
                'message' => "Incident status successfully updated to {$newStatus}.",
                'status'  => $newStatus
            ]);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    // -------------------------------------------------------------------------
    // POST /api/reports.php?action=delete -> Delete report
    // -------------------------------------------------------------------------
    if ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $reportId = (int)($input['report_id'] ?? 0);

        if ($reportId <= 0) {
            \FixMyCampus\Core\Response::json(['success' => false, 'message' => 'Valid report_id required.'], 400);
        }

        db_execute("DELETE FROM `reports` WHERE `id` = :id", [':id' => $reportId]);

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'message' => "Defect report #{$reportId} deleted successfully.",
        ]);
    }

    // -------------------------------------------------------------------------
    // GET /api/reports.php?action=detail&id=X -> Single report details
    // -------------------------------------------------------------------------
    if ($action === 'detail') {
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            \FixMyCampus\Core\Response::json(['success' => false, 'message' => 'Invalid report ID'], 400);
        }

        $report = db_fetch_one("
            SELECT 
                r.*,
                c.name AS category_name,
                c.icon AS category_icon,
                c.sla_hours,
                b.id AS building_id,
                b.code AS building_code,
                b.name AS building_name,
                l.id AS location_id,
                l.name AS location_name,
                l.room_number,
                f.floor_name,
                u.id AS reporter_id,
                u.full_name AS reporter_name,
                u.email AS reporter_email,
                u.user_identifier AS reporter_identifier,
                ra.assigned_to AS worker_id,
                w.full_name AS worker_name,
                w.department AS worker_department,
                w.email AS worker_email,
                ra.status AS assignment_status
            FROM `reports` r
            LEFT JOIN `categories` c ON r.category_id = c.id
            LEFT JOIN `locations` l ON r.location_id = l.id
            LEFT JOIN `floors` f ON l.floor_id = f.id
            LEFT JOIN `buildings` b ON l.building_id = b.id
            LEFT JOIN `users` u ON r.reporter_id = u.id
            LEFT JOIN `report_assignments` ra ON r.id = ra.report_id
            LEFT JOIN `users` w ON ra.assigned_to = w.id
            WHERE r.id = :id
            LIMIT 1
        ", [':id' => $id]);

        if (!$report) {
            \FixMyCampus\Core\Response::json(['success' => false, 'message' => 'Report not found'], 404);
        }

        $attachments = db_fetch_all("
            SELECT * FROM `report_attachments` WHERE `report_id` = :id ORDER BY `id` ASC
        ", [':id' => $id]);

        $report['attachments'] = $attachments;

        if (!empty($attachments)) {
            $report['image_url'] = $attachments[0]['file_path'];
        } else {
            $report['image_url'] = '/images/campus_courtyard.jpg';
        }

        \FixMyCampus\Core\Response::json(['success' => true, 'data' => $report]);
    }

    // -------------------------------------------------------------------------
    // GET /api/reports.php -> List reports with filters
    // -------------------------------------------------------------------------
    $statusFilter   = $_GET['status'] ?? null;
    $priorityFilter = $_GET['priority'] ?? null;
    $buildingFilter = $_GET['building_id'] ?? null;
    $categoryFilter = $_GET['category_id'] ?? null;
    $search         = trim($_GET['search'] ?? '');
    $limit          = min((int)($_GET['limit'] ?? 50), 200);
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
            u.user_identifier AS reporter_identifier,
            ra.assigned_to AS worker_id,
            w.full_name AS worker_name,
            w.department AS worker_department,
            (SELECT file_path FROM `report_attachments` WHERE report_id = r.id ORDER BY id ASC LIMIT 1) AS primary_photo
        FROM `reports` r
        LEFT JOIN `categories` c ON r.category_id = c.id
        LEFT JOIN `locations` l ON r.location_id = l.id
        LEFT JOIN `buildings` b ON l.building_id = b.id
        LEFT JOIN `users` u ON r.reporter_id = u.id
        LEFT JOIN `report_assignments` ra ON r.id = ra.report_id
        LEFT JOIN `users` w ON ra.assigned_to = w.id
        WHERE 1=1
    ";

    $params = [];

    if ($myOnly) {
        $user = auth_user();
        if ($user) {
            $sql .= " AND r.reporter_id = :reporter_id";
            $params[':reporter_id'] = $user['id'];
        }
    }

    if (!empty($statusFilter) && $statusFilter !== 'all') {
        $sql .= " AND r.status = :status";
        $params[':status'] = $statusFilter;
    }

    if (!empty($priorityFilter) && $priorityFilter !== 'all') {
        $sql .= " AND r.priority = :priority";
        $params[':priority'] = $priorityFilter;
    }

    if (!empty($buildingFilter) && $buildingFilter !== 'all') {
        $sql .= " AND b.id = :building_id";
        $params[':building_id'] = (int)$buildingFilter;
    }

    if (!empty($categoryFilter) && $categoryFilter !== 'all') {
        $sql .= " AND c.id = :category_id";
        $params[':category_id'] = (int)$categoryFilter;
    }

    if (!empty($search)) {
        $sql .= " AND (r.title LIKE :s OR r.ticket_number LIKE :s OR u.full_name LIKE :s OR b.name LIKE :s OR l.room_number LIKE :s)";
        $params[':s'] = "%{$search}%";
    }

    $sql .= " ORDER BY r.reported_at DESC LIMIT " . $limit;

    $reports = db_fetch_all($sql, $params);

    foreach ($reports as &$item) {
        if (!empty($item['primary_photo'])) {
            $item['image_url'] = $item['primary_photo'];
        } else {
            $item['image_url'] = '/images/campus_courtyard.jpg';
        }
    }
    unset($item);

    \FixMyCampus\Core\Response::json([
        'success' => true,
        'count'   => count($reports),
        'data'    => $reports,
    ]);
} catch (\Throwable $e) {
    \FixMyCampus\Core\Response::json([
        'success' => false,
        'error'   => $e->getMessage(),
    ], 500);
}
