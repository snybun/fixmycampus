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
require_once SRC_PATH . '/helpers/notifications.php';

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

/**
 * Helper to process and persist report photos.
 * Decodes base64 data URIs and saves them into public/uploads/reports/.
 * Existing file paths (/uploads/... or /images/...) are preserved.
 */
function save_report_photo(?string $photoData, string $prefix = 'defect'): ?array {
    if (empty($photoData)) {
        return null;
    }

    $photoData = trim($photoData);

    // If it's already a relative path or web URL, preserve it
    if (!str_starts_with($photoData, 'data:')) {
        return [
            'path' => $photoData,
            'name' => basename($photoData),
            'type' => 'image/jpeg',
            'size' => 1024,
        ];
    }

    // Extract mime type and base64 string from data URI
    if (!preg_match('/^data:(image\/[a-zA-Z0-9.+_-]+);base64,(.*)$/s', $photoData, $matches)) {
        if (!preg_match('/^data:.*?;base64,(.*)$/s', $photoData, $matches)) {
            return null;
        }
        $mimeType = 'image/jpeg';
        $base64Content = $matches[1];
    } else {
        $mimeType = strtolower($matches[1]);
        $base64Content = $matches[2];
    }

    $decodedBinary = base64_decode($base64Content, true);
    if ($decodedBinary === false) {
        return null;
    }

    $extension = match ($mimeType) {
        'image/png'     => 'png',
        'image/gif'     => 'gif',
        'image/webp'    => 'webp',
        'image/svg+xml' => 'svg',
        default         => 'jpg',
    };

    $uploadDir = dirname(__DIR__) . '/uploads/reports';
    if (!is_dir($uploadDir)) {
        @mkdir($uploadDir, 0777, true);
    }

    $fileName = $prefix . '_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
    $filePathOnDisk = $uploadDir . '/' . $fileName;

    if (@file_put_contents($filePathOnDisk, $decodedBinary) === false) {
        error_log("[FixMyCampus] Failed to write uploaded report photo to: {$filePathOnDisk}");
        return null;
    }

    @chmod($filePathOnDisk, 0666);

    return [
        'path' => '/uploads/reports/' . $fileName,
        'name' => $fileName,
        'type' => $mimeType,
        'size' => strlen($decodedBinary),
    ];
}

try {
    // -------------------------------------------------------------------------
    // POST /api/reports.php?action=create -> Submit defect report
    // -------------------------------------------------------------------------
    if ($action === 'create' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $user = auth_user();
        if (!$user) {
            // Development fallback: resolve active student user (Mark Cerna) or first active user
            $user = db_fetch_one("SELECT * FROM `users` WHERE `email` = 'mafe.cerna.up@phinmaed.com' LIMIT 1")
                 ?: db_fetch_one("SELECT * FROM `users` WHERE `status` = 'active' ORDER BY id ASC LIMIT 1");
            if ($user) {
                auth_login($user);
            } else {
                $user = auth_require();
            }
        }
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
        $priority         = strtolower(trim($input['priority'] ?? 'medium'));
        if ($priority === 'urgent') {
            $priority = 'emergency';
        }
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

        $primaryPhotoRecord = save_report_photo($primaryPhoto, 'primary');
        if ($primaryPhotoRecord) {
            db_insert('report_attachments', [
                'report_id'        => $reportId,
                'uploaded_by'      => $user['id'],
                'file_path'        => $primaryPhotoRecord['path'],
                'file_name'        => $primaryPhotoRecord['name'],
                'file_type'        => $primaryPhotoRecord['type'],
                'file_size'        => $primaryPhotoRecord['size'],
                'attachment_stage' => 'initial_defect',
            ]);
        }

        if (!empty($additionalPhotos) && is_array($additionalPhotos)) {
            foreach ($additionalPhotos as $idx => $photoData) {
                if (!empty($photoData)) {
                    $savedAddPhoto = save_report_photo($photoData, 'add_' . ($idx + 1));
                    if ($savedAddPhoto) {
                        db_insert('report_attachments', [
                            'report_id'        => $reportId,
                            'uploaded_by'      => $user['id'],
                            'file_path'        => $savedAddPhoto['path'],
                            'file_name'        => $savedAddPhoto['name'],
                            'file_type'        => $savedAddPhoto['type'],
                            'file_size'        => $savedAddPhoto['size'],
                            'attachment_stage' => 'initial_defect',
                        ]);
                    }
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

        // Dispatch notifications to reporter and campus facility personnel
        create_notification(
            (int)$user['id'],
            $reportId,
            'submitted',
            "Report {$ticketNumber} Submitted Successfully",
            "Your report for '{$title}' has been logged and queued for facility review."
        );

        notify_admins_and_supervisors(
            $reportId,
            in_array($priority, ['high', 'emergency'], true) ? 'emergency' : 'new_report',
            "New Defect Report: {$ticketNumber} - {$title}",
            "Reported by {$user['full_name']} with " . ucfirst($priority) . " priority."
        );

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
        $actorUser = auth_require_role(['admin', 'supervisor']);
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $reportId = (int)($input['report_id'] ?? 0);
        $technicianId = (int)($input['assigned_to'] ?? 0);
        $notes = trim($input['notes'] ?? 'Assigned by Administrator');
        $assignedBy = (int)($input['assigned_by'] ?? ($actorUser['id'] ?? 1));

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

        $report = db_fetch_one("SELECT id, status, ticket_number, title, reporter_id, priority FROM `reports` WHERE id = :id", [':id' => $reportId]);
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

            // Dispatch notification to technician and student reporter
            create_notification(
                (int)$technicianId,
                $reportId,
                'work_order',
                "New Work Order Dispatched: {$report['ticket_number']} - {$report['title']}",
                "Work order assigned by {$actorUser['full_name']}. Notes: {$notes}."
            );

            if (!empty($report['reporter_id'])) {
                create_notification(
                    (int)$report['reporter_id'],
                    $reportId,
                    'assignment',
                    "Maintenance Staff Assigned to {$report['ticket_number']}",
                    "Worker {$tech['full_name']} ({$tech['department']}) has been assigned to your report."
                );
            }

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
        $actorUser = auth_require_role(['admin', 'supervisor', 'technician']);
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $reportId = (int)($input['report_id'] ?? 0);
        $newStatus = trim($input['status'] ?? '');
        $remarks = trim($input['remarks'] ?? 'Status updated by Staff');
        $changedBy = (int)($input['changed_by'] ?? ($actorUser['id'] ?? 1));

        $allowedStatuses = ['submitted', 'under_review', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed', 'rejected'];
        if ($reportId <= 0 || !in_array($newStatus, $allowedStatuses, true)) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Invalid report_id or status value.'
            ], 400);
        }

        $report = db_fetch_one("SELECT id, status, ticket_number, title, reporter_id FROM `reports` WHERE id = :id", [':id' => $reportId]);
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

            // Notify reporter and management on status changes
            $tNum = $report['ticket_number'] ?? "FMC-{$reportId}";
            $repTitle = $report['title'] ?? 'Defect Report';
            $repId = (int)($report['reporter_id'] ?? 0);

            if ($newStatus === 'in_progress') {
                if ($repId > 0) {
                    create_notification($repId, $reportId, 'in_progress', "Repair In Progress: {$tNum}", "Maintenance personnel started repair work on '{$repTitle}'.");
                }
                notify_admins_and_supervisors($reportId, 'update', "Work In Progress: {$tNum}", "'{$repTitle}' marked in progress by {$actorUser['full_name']}.");
            } elseif ($newStatus === 'resolved') {
                if ($repId > 0) {
                    create_notification($repId, $reportId, 'verified', "Issue Fixed: {$tNum} - {$repTitle}", "Your reported issue has been repaired. Remarks: {$remarks}");
                }
                notify_admins_and_supervisors($reportId, 'verified', "Repair Completed: {$tNum}", "'{$repTitle}' was marked resolved by {$actorUser['full_name']}.");
            } elseif ($newStatus === 'under_review') {
                if ($repId > 0) {
                    create_notification($repId, $reportId, 'update', "Report Under Review: {$tNum}", "Campus facilities is reviewing your defect report for '{$repTitle}'.");
                }
            }

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
        $actorUser = auth_require();
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $reportId = (int)($input['report_id'] ?? $input['id'] ?? 0);

        if ($reportId <= 0) {
            \FixMyCampus\Core\Response::json(['success' => false, 'message' => 'Valid report_id required.'], 400);
        }

        $report = db_fetch_one("
            SELECT r.id, r.title, r.ticket_number, r.reporter_id, r.status,
                   ra.assigned_to AS worker_id
            FROM `reports` r
            LEFT JOIN `report_assignments` ra ON r.id = ra.report_id
            WHERE r.id = :id
            LIMIT 1
        ", [':id' => $reportId]);

        if (!$report) {
            \FixMyCampus\Core\Response::json(['success' => false, 'message' => 'Report not found or already deleted.'], 404);
        }

        $isAdmin = auth_is_admin() || ($actorUser['role_name'] ?? '') === 'admin' || ((int)($actorUser['role_id'] ?? 0) === 1);
        $isReporter = ((int)$report['reporter_id'] === (int)$actorUser['id']);

        // Check if report already has an assigned worker
        $hasAssignedWorker = !empty($report['worker_id']) || in_array(strtolower($report['status']), ['assigned', 'in_progress', 'resolved', 'closed'], true);

        if (!$isAdmin) {
            if (!$isReporter) {
                \FixMyCampus\Core\Response::json(['success' => false, 'message' => 'Unauthorized: You can only delete your own submitted reports.'], 403);
            }
            if ($hasAssignedWorker) {
                \FixMyCampus\Core\Response::json(['success' => false, 'message' => 'This report cannot be deleted because a maintenance worker has already been assigned.'], 400);
            }
        } else {
            // Admins can delete reports after they have been marked as fixed / resolved / closed
            $reportStatus = strtolower($report['status'] ?? '');
            $isFixed = in_array($reportStatus, ['resolved', 'closed'], true);
            if (!$isFixed) {
                \FixMyCampus\Core\Response::json([
                    'success' => false,
                    'message' => 'Admins can only delete reports after they have been fixed and resolved.'
                ], 400);
            }
        }

        // Clean up any uploaded photos from disk to keep storage clean
        $attachments = db_fetch_all("SELECT file_path FROM `report_attachments` WHERE `report_id` = :id", [':id' => $reportId]);
        foreach ($attachments as $att) {
            $fPath = $att['file_path'] ?? '';
            if (!empty($fPath) && str_starts_with($fPath, '/uploads/')) {
                $diskPath = dirname(__DIR__) . $fPath;
                if (file_exists($diskPath) && is_file($diskPath)) {
                    @unlink($diskPath);
                }
            }
        }

        db_execute("DELETE FROM `reports` WHERE `id` = :id", [':id' => $reportId]);

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'message' => "Defect report #{$reportId} ({$report['title']}) deleted successfully.",
            'id'      => $reportId,
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

        $history = db_fetch_all("
            SELECT rsh.*, u.full_name AS changed_by_name
            FROM `report_status_history` rsh
            LEFT JOIN `users` u ON rsh.changed_by = u.id
            WHERE rsh.report_id = :id
            ORDER BY rsh.created_at ASC
        ", [':id' => $id]);
        $report['status_history'] = $history;

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
            f.floor_name,
            u.id AS reporter_id,
            u.full_name AS reporter_name,
            u.email AS reporter_email,
            u.user_identifier AS reporter_identifier,
            ra.assigned_to AS worker_id,
            ra.assigned_at,
            ra.target_completion_date,
            ra.assignment_notes,
            ra.status AS assignment_status,
            w.full_name AS worker_name,
            w.department AS worker_department,
            (SELECT file_path FROM `report_attachments` WHERE report_id = r.id ORDER BY id ASC LIMIT 1) AS primary_photo
        FROM `reports` r
        LEFT JOIN `categories` c ON r.category_id = c.id
        LEFT JOIN `locations` l ON r.location_id = l.id
        LEFT JOIN `floors` f ON l.floor_id = f.id
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

    $workerFilter = $_GET['worker_id'] ?? $_GET['assigned_to'] ?? null;
    if (!empty($workerFilter) && $workerFilter !== 'all') {
        $sql .= " AND ra.assigned_to = :worker_id";
        $params[':worker_id'] = (int)$workerFilter;
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
