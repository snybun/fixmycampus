<?php

declare(strict_types=1);

/**
 * FixMyCampus REST API - Authentication Endpoint
 * Manages session login, user profile verification, and logout.
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
$action = $_GET['action'] ?? 'me';

try {
    if ($action === 'me') {
        \FixMyCampus\Core\Response::json([
            'authenticated' => auth_check(),
            'user'          => auth_user(),
        ]);
    }

    if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $email = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';

        if (empty($email) || empty($password)) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Email and password are required.',
            ], 400);
        }

        $user = db_fetch_one("
            SELECT u.*, r.name as role_name, r.display_name as role_display
            FROM `users` u
            JOIN `roles` r ON u.role_id = r.id
            WHERE u.email = :email
            LIMIT 1
        ", [':email' => $email]);

        if (!$user || !password_verify($password, $user['password_hash'])) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Invalid email or password.',
            ], 401);
        }

        if ($user['status'] !== 'active') {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Account is not active.',
            ], 403);
        }

        // Login user
        auth_login($user);

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'message' => 'Authentication successful.',
            'user'    => auth_user(),
        ]);
    }

    if ($action === 'logout') {
        auth_logout();
        \FixMyCampus\Core\Response::json([
            'success' => true,
            'message' => 'Logged out successfully.',
        ]);
    }

    \FixMyCampus\Core\Response::json(['error' => 'Invalid action'], 400);
} catch (\Throwable $e) {
    \FixMyCampus\Core\Response::json([
        'success' => false,
        'error'   => $e->getMessage(),
    ], 500);
}
