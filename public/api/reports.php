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
require_once SRC_PATH . '/helpers/history_logs.php';
require_once SRC_PATH . '/helpers/staff_seed.php';

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

        // Auto-route to suggested maintenance specialist based on category specialization
        $suggestedWorker = find_suggested_worker_for_category($categoryId);
        if ($suggestedWorker && !empty($suggestedWorker['id'])) {
            db_insert('report_assignments', [
                'report_id'        => $reportId,
                'assigned_to'      => (int)$suggestedWorker['id'],
                'assigned_by'      => 1, // System Dispatcher
                'assignment_notes' => "Auto-routed to {$suggestedWorker['full_name']} based on {$suggestedWorker['department']} specialization.",
                'status'           => 'pending',
            ]);

            create_notification(
                (int)$suggestedWorker['id'],
                $reportId,
                'assigned',
                "Work Order Assigned: {$ticketNumber}",
                "Defect ticket {$ticketNumber} ({$title}) has been auto-assigned to you based on your {$suggestedWorker['department']} specialization."
            );
        }

        $logLoc = trim(($buildingName ?: 'Campus') . ' • ' . ($roomCoord ?: $specificArea ?: 'General Area'));
        $workerNote = $suggestedWorker ? " • Suggested Specialist: {$suggestedWorker['full_name']} ({$suggestedWorker['department']})" : '';
        record_history_log(
            'report_submitted',
            "Incident Reported: {$ticketNumber} - {$title}",
            "Submitted by {$user['full_name']} with " . ucfirst($priority) . " priority.{$workerNote} Description: {$description}",
            (int)$user['id'],
            $reportId,
            $user['full_name'],
            'Student',
            $logLoc,
            [
                'ticket_number'    => $ticketNumber,
                'priority'         => $priority,
                'status'           => 'submitted',
                'location'         => $logLoc,
                'suggested_worker' => $suggestedWorker['full_name'] ?? null,
                'specialization'   => $suggestedWorker['department'] ?? null,
            ]
        );

        \FixMyCampus\Core\Response::json([
            'success'          => true,
            'message'          => 'Defect report submitted successfully.',
            'report_id'        => $reportId,
            'ticket_number'    => $ticketNumber,
            'suggested_worker' => $suggestedWorker,
        ], 201);
    }

    // -------------------------------------------------------------------------
    // GET /api/reports.php?action=check_duplicate -> Check for open report in room
    // -------------------------------------------------------------------------
    if ($action === 'check_duplicate' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        $buildingId   = (int)($_GET['building_id'] ?? 0);
        $buildingName = trim($_GET['building_name'] ?? '');
        $categoryId   = (int)($_GET['category_id'] ?? 0);
        $categorySlug = trim($_GET['category_slug'] ?? '');
        $roomNumber   = trim($_GET['room_number'] ?? $_GET['room'] ?? '');
        $currentUser  = auth_user();
        $currentUserId = $currentUser['id'] ?? 11;

        $duplicateFound = false;
        $existingReport = null;

        // 1. Check in MySQL database if open report exists for this room & category
        if (!empty($roomNumber)) {
            $sqlCheck = "
                SELECT 
                    r.id,
                    r.ticket_number,
                    r.title,
                    r.description,
                    r.priority,
                    r.status,
                    r.specific_area,
                    r.reported_at,
                    c.name AS category_name,
                    c.slug AS category_slug,
                    b.name AS building_name,
                    l.room_number,
                    (SELECT file_path FROM `report_attachments` WHERE report_id = r.id ORDER BY id ASC LIMIT 1) AS primary_photo,
                    (SELECT COUNT(*) FROM `report_confirmations` WHERE report_id = r.id) AS confirmation_count,
                    (SELECT COUNT(*) FROM `report_confirmations` WHERE report_id = r.id AND user_id = :uid) AS has_confirmed
                FROM `reports` r
                JOIN `locations` l ON r.location_id = l.id
                JOIN `buildings` b ON l.building_id = b.id
                JOIN `categories` c ON r.category_id = c.id
                WHERE r.status IN ('submitted', 'under_review', 'assigned', 'in_progress')
                  AND (
                      LOWER(l.room_number) = LOWER(:room) 
                      OR LOWER(r.specific_area) LIKE LOWER(:room_like)
                  )
            ";
            $checkParams = [
                ':room'      => $roomNumber,
                ':room_like' => "%{$roomNumber}%",
                ':uid'       => $currentUserId,
            ];

            if ($buildingId > 0) {
                $sqlCheck .= " AND b.id = :bid";
                $checkParams[':bid'] = $buildingId;
            } elseif (!empty($buildingName)) {
                $sqlCheck .= " AND LOWER(b.name) LIKE LOWER(:bname)";
                $checkParams[':bname'] = "%{$buildingName}%";
            }

            if ($categoryId > 0) {
                $sqlCheck .= " AND c.id = :cid";
                $checkParams[':cid'] = $categoryId;
            } elseif (!empty($categorySlug)) {
                $sqlCheck .= " AND LOWER(c.slug) = LOWER(:cslug)";
                $checkParams[':cslug'] = $categorySlug;
            }

            $sqlCheck .= " ORDER BY r.reported_at DESC LIMIT 1";

            $dbMatch = db_fetch_one($sqlCheck, $checkParams);
            if ($dbMatch) {
                $duplicateFound = true;
                $existingReport = [
                    'id'                 => (int)$dbMatch['id'],
                    'ticket_number'      => $dbMatch['ticket_number'],
                    'title'              => $dbMatch['title'],
                    'description'        => $dbMatch['description'],
                    'priority'           => $dbMatch['priority'],
                    'status'             => $dbMatch['status'],
                    'category_name'      => $dbMatch['category_name'],
                    'building_name'      => $dbMatch['building_name'],
                    'room_number'        => $dbMatch['room_number'],
                    'location_summary'   => "{$dbMatch['building_name']} • {$dbMatch['room_number']}",
                    'primary_photo'      => $dbMatch['primary_photo'] ?: '/images/hero_ac_defect.jpg',
                    'confirmation_count' => max(1, (int)$dbMatch['confirmation_count']),
                    'has_confirmed'      => ((int)$dbMatch['has_confirmed'] > 0),
                    'reported_time_ago'  => 'Recently active',
                ];
            }
        }

        // 2. Fallback check matching default demo jobs (e.g. Room 304 + AC, Room 201 + Electrical, Room 102 + Plumbing)
        if (!$duplicateFound && !empty($roomNumber)) {
            $normRoom = preg_replace('/[^0-9a-zA-Z]/', '', strtolower($roomNumber));
            $normCat = strtolower($categorySlug ?: '');

            // Known default active jobs in campus
            $demoJobs = [
                '304' => [
                    'id'                 => 102,
                    'ticket_number'      => 'FM-102',
                    'title'              => 'Broken Air Conditioner',
                    'description'        => 'The AC unit in Room 304 is leaking water heavily and blowing warm air instead of cooling the room.',
                    'category_name'      => 'Air Conditioning',
                    'category_keywords'  => ['air', 'ac', 'cooling', 'hvac'],
                    'building_name'      => 'Engineering Building',
                    'room_number'        => 'Room 304',
                    'location_summary'   => 'Engineering Building • Room 304',
                    'priority'           => 'high',
                    'status'             => 'in_progress',
                    'assigned_worker'    => 'Mark Santos (Lead HVAC Tech)',
                    'primary_photo'      => '/images/hero_ac_defect.jpg',
                    'base_confirmations' => 8,
                ],
                '201' => [
                    'id'                 => 103,
                    'ticket_number'      => 'FM-103',
                    'title'              => 'Faulty Electrical Outlet',
                    'description'        => 'Outlet sparks intermittently when plugging in laptop charger. Needs socket inspection and breaker check.',
                    'category_name'      => 'Electrical',
                    'category_keywords'  => ['elect', 'outlet', 'spark', 'light'],
                    'building_name'      => 'Main Building',
                    'room_number'        => 'Room 201',
                    'location_summary'   => 'Main Building • Room 201',
                    'priority'           => 'medium',
                    'status'             => 'assigned',
                    'assigned_worker'    => 'Carlos Ramos Assigned',
                    'primary_photo'      => '/images/faulty_light_switch.jpg',
                    'base_confirmations' => 4,
                ],
                '102' => [
                    'id'                 => 104,
                    'ticket_number'      => 'FM-104',
                    'title'              => 'Leaking Faucet',
                    'description'        => 'Wash basin faucet does not shut off completely, wasting water all day and creating a slip hazard near entrance.',
                    'category_name'      => 'Restroom',
                    'category_keywords'  => ['restroom', 'plumb', 'faucet', 'leak', 'water'],
                    'building_name'      => 'Science Building',
                    'room_number'        => 'Restroom 102',
                    'location_summary'   => 'Science Building • Room 102',
                    'priority'           => 'high',
                    'status'             => 'in_progress',
                    'assigned_worker'    => 'John Miller Assigned',
                    'primary_photo'      => 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
                    'base_confirmations' => 6,
                ],
            ];

            foreach ($demoJobs as $key => $demo) {
                if (str_contains($normRoom, (string)$key)) {
                    // Check if category matches or is compatible
                    $catMatch = false;
                    if ($categoryId > 0 || !empty($normCat)) {
                        foreach ($demo['category_keywords'] as $kw) {
                            if (str_contains($normCat, $kw) || str_contains(strtolower($demo['category_name']), $kw)) {
                                $catMatch = true;
                                break;
                            }
                        }
                    } else {
                        $catMatch = true;
                    }

                    if ($catMatch) {
                        $sessionKey = 'fmc_confirmations_' . $demo['id'];
                        $sessionConfirms = $_SESSION[$sessionKey] ?? [];
                        $hasConfirmed = in_array($currentUserId, $sessionConfirms, true);

                        $duplicateFound = true;
                        $existingReport = [
                            'id'                 => $demo['id'],
                            'ticket_number'      => $demo['ticket_number'],
                            'title'              => $demo['title'],
                            'description'        => $demo['description'],
                            'priority'           => $demo['priority'],
                            'status'             => $demo['status'],
                            'category_name'      => $demo['category_name'],
                            'building_name'      => $demo['building_name'],
                            'room_number'        => $demo['room_number'],
                            'location_summary'   => $demo['location_summary'],
                            'assigned_worker'    => $demo['assigned_worker'],
                            'primary_photo'      => $demo['primary_photo'],
                            'confirmation_count' => $demo['base_confirmations'] + count($sessionConfirms),
                            'has_confirmed'      => $hasConfirmed,
                            'reported_time_ago'  => 'Recently active',
                        ];
                        break;
                    }
                }
            }
        }

        \FixMyCampus\Core\Response::json([
            'success'          => true,
            'duplicate_found'  => $duplicateFound,
            'existing_report'  => $existingReport,
        ]);
        exit;
    }

    // -------------------------------------------------------------------------
    // POST /api/reports.php?action=confirm_report -> Upvote / Confirm open report
    // -------------------------------------------------------------------------
    if ($action === 'confirm_report' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $user = auth_user();
        if (!$user) {
            $user = db_fetch_one("SELECT * FROM `users` WHERE `email` = 'mafe.cerna.up@phinmaed.com' LIMIT 1")
                 ?: db_fetch_one("SELECT * FROM `users` WHERE `status` = 'active' ORDER BY id ASC LIMIT 1");
            if ($user) {
                auth_login($user);
            } else {
                $user = auth_require();
            }
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $reportId = (int)($input['report_id'] ?? 0);
        $ticketNumber = trim($input['ticket_number'] ?? '');

        if ($reportId <= 0 && !empty($ticketNumber)) {
            $dbRep = db_fetch_one("SELECT id FROM `reports` WHERE `ticket_number` = :tn LIMIT 1", [':tn' => $ticketNumber]);
            if ($dbRep) {
                $reportId = (int)$dbRep['id'];
            }
        }

        if ($reportId <= 0) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Valid report_id or ticket_number required.'
            ], 400);
        }

        $userId = (int)$user['id'];
        $newCount = 1;

        // Check if report exists in database
        $reportRow = db_fetch_one("SELECT id, ticket_number, title FROM `reports` WHERE `id` = :id LIMIT 1", [':id' => $reportId]);
        if ($reportRow) {
            // Insert confirmation into database with duplicate protection
            db_execute("
                INSERT INTO `report_confirmations` (`report_id`, `user_id`)
                VALUES (:rid, :uid)
                ON DUPLICATE KEY UPDATE `created_at` = NOW()
            ", [':rid' => $reportId, ':uid' => $userId]);

            $countRow = db_fetch_one("SELECT COUNT(*) as c FROM `report_confirmations` WHERE `report_id` = :rid", [':rid' => $reportId]);
            $newCount = max(1, (int)($countRow['c'] ?? 1));

            // Also create a subscriber notification for the student
            db_execute("
                INSERT INTO `notifications` (`user_id`, `report_id`, `title`, `message`, `is_read`)
                VALUES (:uid, :rid, :title, :msg, 0)
            ", [
                ':uid'   => $userId,
                ':rid'   => $reportId,
                ':title' => "Confirmed Ticket: {$reportRow['ticket_number']}",
                ':msg'   => "You confirmed the issue '{$reportRow['title']}'. You will receive alerts as repairs progress.",
            ]);
        } else {
            // For mock demo jobs (IDs 102, 103, 104, etc.)
            $sessionKey = 'fmc_confirmations_' . $reportId;
            if (!isset($_SESSION[$sessionKey])) {
                $_SESSION[$sessionKey] = [];
            }
            if (!in_array($userId, $_SESSION[$sessionKey], true)) {
                $_SESSION[$sessionKey][] = $userId;
            }
            $baseCounts = [102 => 8, 103 => 4, 104 => 6, 105 => 3, 106 => 5, 107 => 7];
            $base = $baseCounts[$reportId] ?? 2;
            $newCount = $base + count($_SESSION[$sessionKey]);

            if (!isset($_SESSION['mock_confirmed_reports'])) {
                $_SESSION['mock_confirmed_reports'] = [];
            }
            $mockTitles = [
                102 => ['Broken Air Conditioner', 'Air Conditioning', 'Engineering Building', 'Room 304', '/images/hero_ac_defect.jpg'],
                103 => ['Faulty Electrical Outlet', 'Electrical & Lighting', 'Main Building', 'Room 201', '/images/faulty_light_switch.jpg'],
                104 => ['Leaking Faucet', 'Plumbing & Restroom', 'Science Building', 'Restroom 102', 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80'],
            ];
            $tInfo = $mockTitles[$reportId] ?? ['Reported Facility Issue', 'General Maintenance', 'Main Campus', 'Room 101', '/images/hero_ac_defect.jpg'];
            $_SESSION['mock_confirmed_reports'][$reportId] = [
                'id'                 => $reportId,
                'ticket_number'      => 'FM-' . $reportId,
                'title'              => $tInfo[0],
                'description'        => 'Defect report confirmed by student for repair tracking.',
                'priority'           => 'high',
                'status'             => 'assigned',
                'category_name'      => $tInfo[1],
                'building_name'      => $tInfo[2],
                'room_number'        => $tInfo[3],
                'specific_area'      => $tInfo[3],
                'reported_at'        => date('Y-m-d H:i:s'),
                'assigned_worker_name' => 'Mark Santos',
                'primary_photo'      => $tInfo[4],
                'image_url'          => $tInfo[4],
                'confirmation_count' => $newCount,
                'is_confirmed'       => 1,
                'has_confirmed'      => true,
            ];
        }

        \FixMyCampus\Core\Response::json([
            'success'            => true,
            'message'            => 'Thank you! You have confirmed this defect report and will receive repair updates.',
            'report_id'          => $reportId,
            'ticket_number'      => $reportRow['ticket_number'] ?? $ticketNumber,
            'confirmation_count' => $newCount,
            'has_confirmed'      => true,
        ]);
        exit;
    }

    // -------------------------------------------------------------------------
    // POST /api/reports.php?action=assign -> Assign maintenance technician
    // -------------------------------------------------------------------------
    if ($action === 'assign' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $actorUser = auth_require_role(['admin', 'supervisor', 'technician']);
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

        $currentRawStatus = strtolower($report['status'] ?? '');
        if (in_array($currentRawStatus, ['resolved', 'closed', 'fixed'], true)) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'This incident is already resolved and locked. Worker cannot be reassigned.'
            ], 400);
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

            // Only transition report status to 'assigned' if it's currently submitted or under_review.
            // If the report is already in_progress or resolved, do NOT regress the status back to assigned!
            $finalStatus = $report['status'];
            if (in_array($report['status'], ['submitted', 'under_review', 'assigned'], true)) {
                $finalStatus = 'assigned';
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
            }

            $pdo->commit();

            // Dispatch notification to technician, reporter, and management
            create_notification(
                (int)$technicianId,
                $reportId,
                'work_order',
                "New Work Order Dispatched: {$report['ticket_number']} - {$report['title']}",
                "Work order assigned by {$actorUser['full_name']}. Notes: {$notes}"
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

            notify_admins_and_supervisors(
                $reportId,
                'assignment',
                "Worker Assigned: {$report['ticket_number']}",
                "Worker {$tech['full_name']} ({$tech['department']}) assigned to '{$report['title']}'.",
                (int)$actorUser['id']
            );

            \FixMyCampus\Core\Response::json([
                'success'    => true,
                'message'    => "Worker {$tech['full_name']} assigned successfully.",
                'technician' => $tech,
                'status'     => $finalStatus
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

        $currentRawStatus = strtolower($report['status'] ?? '');
        if (in_array($currentRawStatus, ['resolved', 'closed', 'fixed'], true)) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'This incident is already resolved and locked. Status cannot be modified.'
            ], 400);
        }

        $pdo = \FixMyCampus\Core\Database::getConnection();
        $pdo->beginTransaction();

        try {
            db_execute("UPDATE `reports` SET `status` = :status, `updated_at` = NOW() WHERE `id` = :id", [
                ':status' => $newStatus,
                ':id'     => $reportId
            ]);

            // Synchronize work order assignment status with report status transition
            if (in_array($newStatus, ['resolved', 'closed'], true)) {
                db_execute("UPDATE `report_assignments` SET `status` = 'completed', `updated_at` = NOW() WHERE `report_id` = :id", [':id' => $reportId]);
            } elseif ($newStatus === 'in_progress') {
                db_execute("UPDATE `report_assignments` SET `status` = 'in_progress', `updated_at` = NOW() WHERE `report_id` = :id", [':id' => $reportId]);
            } elseif ($newStatus === 'assigned') {
                db_execute("UPDATE `report_assignments` SET `status` = 'accepted', `updated_at` = NOW() WHERE `report_id` = :id", [':id' => $reportId]);
            }

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

            // Notify reporter, assigned technician, and management on status changes
            $tNum = $report['ticket_number'] ?? "FMC-{$reportId}";
            $repTitle = $report['title'] ?? 'Defect Report';
            $repId = (int)($report['reporter_id'] ?? 0);

            // Find assigned technician if exists
            $assignment = db_fetch_one("SELECT assigned_to FROM `report_assignments` WHERE `report_id` = :rid LIMIT 1", [':rid' => $reportId]);
            $assignedWorkerId = $assignment ? (int)$assignment['assigned_to'] : 0;

            if ($newStatus === 'in_progress') {
                if ($repId > 0) {
                    create_notification(
                        $repId,
                        $reportId,
                        'in_progress',
                        "Repair In Progress: {$tNum} - {$repTitle}",
                        "Maintenance personnel ({$actorUser['full_name']}) has started repair work on '{$repTitle}'."
                    );
                }
                if ($assignedWorkerId > 0 && $assignedWorkerId !== (int)$actorUser['id']) {
                    create_notification(
                        $assignedWorkerId,
                        $reportId,
                        'in_progress',
                        "Repair In Progress: {$tNum} - {$repTitle}",
                        "Work marked in progress by {$actorUser['full_name']}."
                    );
                }
                notify_admins_and_supervisors(
                    $reportId,
                    'in_progress',
                    "Repair In Progress: {$tNum}",
                    "'{$repTitle}' is now in progress (started by {$actorUser['full_name']}).",
                    (int)$actorUser['id']
                );
            } elseif ($newStatus === 'resolved') {
                if ($repId > 0) {
                    create_notification(
                        $repId,
                        $reportId,
                        'verified',
                        "Issue Fixed: {$tNum} - {$repTitle}",
                        "Your reported issue has been repaired by {$actorUser['full_name']}. Remarks: {$remarks}"
                    );
                }
                if ($assignedWorkerId > 0 && $assignedWorkerId !== (int)$actorUser['id']) {
                    create_notification(
                        $assignedWorkerId,
                        $reportId,
                        'verified',
                        "Repair Completed: {$tNum}",
                        "'{$repTitle}' was marked resolved by {$actorUser['full_name']}."
                    );
                }
                notify_admins_and_supervisors(
                    $reportId,
                    'verified',
                    "Repair Completed: {$tNum}",
                    "'{$repTitle}' was marked resolved by {$actorUser['full_name']}. Remarks: {$remarks}",
                    (int)$actorUser['id']
                );
            } elseif ($newStatus === 'under_review') {
                if ($repId > 0) {
                    create_notification(
                        $repId,
                        $reportId,
                        'update',
                        "Report Under Review: {$tNum}",
                        "Campus facilities is reviewing your defect report for '{$repTitle}'."
                    );
                }
            } elseif ($newStatus === 'on_hold') {
                if ($repId > 0) {
                    create_notification(
                        $repId,
                        $reportId,
                        'warning',
                        "Work On Hold: {$tNum}",
                        "Work on '{$repTitle}' has been placed on hold. Reason: {$remarks}"
                    );
                }
                notify_admins_and_supervisors(
                    $reportId,
                    'warning',
                    "Work On Hold: {$tNum}",
                    "'{$repTitle}' placed on hold by {$actorUser['full_name']}. Reason: {$remarks}",
                    (int)$actorUser['id']
                );
            } elseif ($newStatus === 'rejected') {
                if ($repId > 0) {
                    create_notification(
                        $repId,
                        $reportId,
                        'warning',
                        "Report Declined: {$tNum}",
                        "Defect report for '{$repTitle}' was declined. Reason: {$remarks}"
                    );
                }
                notify_admins_and_supervisors(
                    $reportId,
                    'warning',
                    "Report Declined: {$tNum}",
                    "'{$repTitle}' was declined by {$actorUser['full_name']}. Reason: {$remarks}",
                    (int)$actorUser['id']
                );
            }

            $repLoc = trim(($report['building_name'] ?? 'Campus') . ' • ' . ($report['room_number'] ?: $report['specific_area'] ?: 'General Area'));
            record_history_log(
                'status_change',
                "Status Update: {$tNum} (" . ucfirst(str_replace('_', ' ', $newStatus)) . ")",
                "Status updated from " . ucfirst(str_replace('_', ' ', $report['status'])) . " to " . ucfirst(str_replace('_', ' ', $newStatus)) . " by {$actorUser['full_name']}." . ($remarks ? " Remarks: {$remarks}" : ''),
                (int)$actorUser['id'],
                $reportId,
                $actorUser['full_name'],
                $actorUser['role_name'] ?? 'Staff',
                $repLoc,
                [
                    'ticket_number'   => $tNum,
                    'previous_status' => $report['status'],
                    'new_status'      => $newStatus,
                    'remarks'         => $remarks,
                ]
            );

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
    // POST /api/reports.php?action=archive -> Archive defect report
    // -------------------------------------------------------------------------
    if ($action === 'archive' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $actorUser = auth_require();
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $reportId = (int)($input['report_id'] ?? $input['id'] ?? 0);

        if ($reportId <= 0) {
            \FixMyCampus\Core\Response::json(['success' => false, 'message' => 'Valid report_id required.'], 400);
        }

        $report = db_fetch_one("
            SELECT r.id, r.title, r.ticket_number, r.reporter_id, r.status, r.specific_area,
                   b.name AS building_name, l.room_number
            FROM `reports` r
            LEFT JOIN `locations` l ON r.location_id = l.id
            LEFT JOIN `buildings` b ON l.building_id = b.id
            WHERE r.id = :id
            LIMIT 1
        ", [':id' => $reportId]);

        if (!$report) {
            \FixMyCampus\Core\Response::json(['success' => false, 'message' => 'Report not found.'], 404);
        }

        db_execute("UPDATE `reports` SET `is_archived` = 1, `archived_at` = NOW(), `archived_by` = :aid WHERE `id` = :id", [
            ':aid' => (int)($actorUser['id'] ?? 1),
            ':id'  => $reportId,
        ]);

        $location = trim(($report['building_name'] ?? 'Campus') . ' • ' . ($report['room_number'] ?: $report['specific_area'] ?: 'General Area'));
        $tNum = $report['ticket_number'] ?: "FMC-{$reportId}";
        $actorName = $actorUser['full_name'] ?? 'Campus Administrator';
        $actorRole = $actorUser['role_name'] ?? 'Administrator';

        record_history_log(
            'report_archived',
            "Report Archived: {$tNum} - {$report['title']}",
            "Archived by {$actorName} (" . ucfirst($actorRole) . "). Incident moved to History Logs.",
            (int)($actorUser['id'] ?? 1),
            $reportId,
            $actorName,
            ucfirst($actorRole),
            $location,
            [
                'ticket_number' => $tNum,
                'title'         => $report['title'],
                'status'        => $report['status'],
                'archived_at'   => date('Y-m-d H:i:s'),
            ]
        );

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'message' => "Report {$tNum} archived successfully and recorded in History Logs.",
            'id'      => $reportId,
        ]);
        exit;
    }

    // -------------------------------------------------------------------------
    // POST /api/reports.php?action=unarchive / restore -> Restore archived report
    // -------------------------------------------------------------------------
    if (($action === 'unarchive' || $action === 'restore') && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $actorUser = auth_require();
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $reportId = (int)($input['report_id'] ?? $input['id'] ?? 0);

        if ($reportId <= 0) {
            \FixMyCampus\Core\Response::json(['success' => false, 'message' => 'Valid report_id required.'], 400);
        }

        db_execute("UPDATE `reports` SET `is_archived` = 0, `archived_at` = NULL, `archived_by` = NULL WHERE `id` = :id", [
            ':id' => $reportId,
        ]);

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'message' => "Report #{$reportId} restored to active status.",
            'id'      => $reportId,
        ]);
        exit;
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
    $limit = ($action === 'export') ? 5000 : min((int)($_GET['limit'] ?? 50), 200);
    $myOnly         = isset($_GET['my_reports']) && $_GET['my_reports'] === '1';

    $user = auth_user();
    $targetUserId = (int)($_GET['user_id'] ?? $_SERVER['HTTP_X_USER_ID'] ?? 0);
    if ($targetUserId <= 0 && $user) {
        $targetUserId = (int)$user['id'];
    }
    $roleName = $user['role_name'] ?? auth_role() ?? '';
    $roleId = (int)($user['role_id'] ?? 0);
    $isStudent = ($roleName === 'student' || $roleId === 5);
    $isAdmin = ($roleName === 'admin' || $roleId === 1 || ($user && (int)$user['id'] === 1));

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
            (SELECT file_path FROM `report_attachments` WHERE report_id = r.id ORDER BY id ASC LIMIT 1) AS primary_photo,
            (SELECT COUNT(*) FROM `report_confirmations` WHERE report_id = r.id) AS confirmation_count
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

    // Scope to user if:
    // 1. my_reports=1 is passed, OR
    // 2. user_id is explicitly passed in a student context, OR
    // 3. Authenticated user is a student and campus/global/all is not requested
    $scopeToUser = $myOnly || ($isStudent && !$isAdmin && !isset($_GET['campus']) && !isset($_GET['all']));
    if ($scopeToUser) {
        if ($targetUserId > 0) {
            $sql .= " AND (r.reporter_id = :reporter_id OR r.id IN (SELECT report_id FROM `report_confirmations` WHERE user_id = :confirmed_uid))";
            $params[':reporter_id'] = $targetUserId;
            $params[':confirmed_uid'] = $targetUserId;
        } else {
            // Unknown or unauthenticated user requesting personal reports -> return empty
            $sql .= " AND 1=0";
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
        $sql .= " AND CONCAT_WS(' ', r.ticket_number, r.title, u.full_name, b.name, l.room_number, r.description) LIKE :search";
        $params[':search'] = "%{$search}%";
    }

    $includeArchived = isset($_GET['include_archived']) && ($_GET['include_archived'] === '1' || $_GET['include_archived'] === 'true');
    $archivedOnly = isset($_GET['archived_only']) && ($_GET['archived_only'] === '1' || $_GET['archived_only'] === 'true');

    if ($archivedOnly) {
        $sql .= " AND r.is_archived = 1";
    } elseif (!$includeArchived) {
        $sql .= " AND (r.is_archived IS NULL OR r.is_archived = 0)";
    }

    $sql .= " ORDER BY r.reported_at DESC LIMIT " . $limit;

    $reports = db_fetch_all($sql, $params);

    // If Excel/CSV export requested, output directly as an attachment stream
    if ($action === 'export') {
        $filename = 'FixMyCampus_Defect_Reports_' . date('Y-m-d_His') . '.csv';
        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');

        $out = fopen('php://output', 'w');
        // UTF-8 BOM for Excel compatibility
        fprintf($out, chr(0xEF) . chr(0xBB) . chr(0xBF));

        fputcsv($out, [
            'Ticket Number',
            'Issue Title',
            'Category',
            'Priority',
            'Status',
            'Building',
            'Floor',
            'Room / Area',
            'Reporter Name',
            'Reporter Email',
            'Reporter ID',
            'Assigned Worker',
            'Worker Department',
            'Date Reported',
            'Last Updated',
            'Description / Notes'
        ]);

        foreach ($reports as $r) {
            $formattedStatus = ucwords(str_replace('_', ' ', strtolower($r['status'] ?? 'submitted')));
            $formattedPriority = ucfirst(strtolower($r['priority'] ?? 'medium'));
            if (strtolower($r['priority'] ?? '') === 'emergency') {
                $formattedPriority = 'Emergency';
            }

            fputcsv($out, [
                $r['ticket_number'] ?? "FMC-{$r['id']}",
                $r['title'] ?? '',
                $r['category_name'] ?? 'General',
                $formattedPriority,
                $formattedStatus,
                $r['building_name'] ?? 'Campus Wide',
                $r['floor_name'] ?? '—',
                $r['room_number'] ?? $r['location_name'] ?? $r['specific_area'] ?? '—',
                $r['reporter_name'] ?? 'Campus User',
                $r['reporter_email'] ?? '—',
                $r['reporter_identifier'] ?? '—',
                $r['worker_name'] ?? 'Unassigned',
                $r['worker_department'] ?? '—',
                $r['reported_at'] ?? '—',
                $r['updated_at'] ?? '—',
                $r['description'] ?? ''
            ]);
        }

        fclose($out);
        exit;
    }

    if ($myOnly && !empty($_SESSION['mock_confirmed_reports'])) {
        foreach ($_SESSION['mock_confirmed_reports'] as $mockRep) {
            array_unshift($reports, $mockRep);
        }
    }

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
