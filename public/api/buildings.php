<?php

declare(strict_types=1);

/**
 * FixMyCampus REST API - Buildings & Facilities Endpoint
 * Returns real campus structures, floor counts, room counts, and incident counts.
 * Supports adding new campus buildings.
 */

require_once dirname(__DIR__, 2) . '/src/config/app.php';
require_once SRC_PATH . '/Core/Database.php';
require_once SRC_PATH . '/Core/Response.php';
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
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $name = trim($input['name'] ?? '');
        $code = strtoupper(trim($input['code'] ?? ''));
        $description = trim($input['description'] ?? '');
        $floorsCount = max(1, (int)($input['floors_count'] ?? 1));

        if (empty($name) || empty($code)) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Building Name and Code are required.'
            ], 400);
        }

        db_execute("
            INSERT INTO `buildings` (`code`, `name`, `description`, `is_active`)
            VALUES (:code, :name, :description, 1)
        ", [
            ':code'        => $code,
            ':name'        => $name,
            ':description' => $description
        ]);

        $newId = (int)db_last_insert_id();

        // Seed default floors for the new building
        for ($i = 0; $i < $floorsCount; $i++) {
            $floorName = ($i === 0) ? 'Ground Floor' : "{$i}th Floor";
            db_execute("
                INSERT INTO `floors` (`building_id`, `floor_number`, `floor_name`)
                VALUES (:bid, :fnum, :fname)
            ", [
                ':bid'   => $newId,
                ':fnum'  => $i,
                ':fname' => $floorName
            ]);
        }

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'message' => "Building {$name} registered successfully.",
            'building' => [
                'id'            => $newId,
                'code'          => $code,
                'name'          => $name,
                'description'   => $description,
                'floors_count'  => $floorsCount,
                'rooms_count'   => 0,
                'reports_count' => 0
            ]
        ], 201);
    }

    // GET Request: list buildings with aggregated real metrics from DB
    $buildings = db_fetch_all("
        SELECT 
            b.id, 
            b.code, 
            b.name, 
            b.description,
            (SELECT COUNT(*) FROM `floors` f WHERE f.building_id = b.id) AS floors_count,
            (SELECT COUNT(*) FROM `locations` l WHERE l.building_id = b.id) AS rooms_count,
            (
                SELECT COUNT(*) 
                FROM `reports` r 
                JOIN `locations` loc ON r.location_id = loc.id 
                WHERE loc.building_id = b.id
            ) AS reports_count
        FROM `buildings` b 
        WHERE b.is_active = 1 
        ORDER BY b.id ASC
    ");

    // Assign realistic images matching each real building type
    $buildingImages = [
        'ENG-BLDG' => 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=800&q=80',
        'SCI-HALL' => 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80',
        'ADM-CTR'  => 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
        'LIB-MAIN' => 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80',
        'SPT-CMP'  => 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
    ];

    foreach ($buildings as &$b) {
        $b['floors_count']  = (int)$b['floors_count'];
        $b['rooms_count']   = (int)$b['rooms_count'];
        $b['reports_count'] = (int)$b['reports_count'];
        $b['image_url']     = $buildingImages[$b['code']] ?? '/images/campus_courtyard.jpg';
    }
    unset($b);

    $locations = db_fetch_all("
        SELECT 
            l.id, 
            l.building_id, 
            l.floor_id,
            l.room_number, 
            l.name, 
            l.type, 
            b.name AS building_name,
            b.code AS building_code,
            f.floor_name
        FROM `locations` l
        JOIN `buildings` b ON l.building_id = b.id
        LEFT JOIN `floors` f ON l.floor_id = f.id
        WHERE l.is_active = 1
        ORDER BY b.name ASC, l.name ASC
    ");

    \FixMyCampus\Core\Response::json([
        'success'   => true,
        'buildings' => $buildings,
        'locations' => $locations,
    ]);
} catch (\Throwable $e) {
    \FixMyCampus\Core\Response::json([
        'success' => false,
        'error'   => $e->getMessage(),
    ], 500);
}
