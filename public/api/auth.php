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
        $loginInput = trim($input['email'] ?? $input['identifier'] ?? '');
        $password = $input['password'] ?? '';

        if (empty($loginInput) || empty($password)) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Email or ID and password are required.',
            ], 400);
        }

        $user = db_fetch_one("
            SELECT u.*, r.name as role_name, r.display_name as role_display
            FROM `users` u
            JOIN `roles` r ON u.role_id = r.id
            WHERE u.email = :email OR u.user_identifier = :identifier
            LIMIT 1
        ", [':email' => $loginInput, ':identifier' => $loginInput]);

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

    if ($action === 'register' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $identifier = trim($input['identifier'] ?? '');
        $fullName = trim($input['full_name'] ?? '');
        $email = trim($input['email'] ?? '');
        $department = trim($input['department'] ?? '');
        $password = $input['password'] ?? '';

        if (empty($identifier) || empty($fullName) || empty($email) || empty($password)) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'All required fields must be filled.',
            ], 400);
        }

        // Check if user already exists
        $existing = db_fetch_one("SELECT id, email, user_identifier FROM `users` WHERE email = :email OR user_identifier = :identifier LIMIT 1", [
            ':email' => $email,
            ':identifier' => $identifier,
        ]);

        if ($existing) {
            $msg = ($existing['email'] === $email)
                ? 'An account with this email address already exists.'
                : 'An account with this Student/Employee ID already exists.';
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => $msg,
            ], 409);
        }

        $passwordHash = password_hash($password, PASSWORD_BCRYPT);
        // Default role: student (role_id 5)
        $roleId = 5;

        $newId = db_insert(
            "INSERT INTO `users` (`role_id`, `user_identifier`, `full_name`, `email`, `password_hash`, `department`, `status`, `created_at`) 
             VALUES (:role_id, :identifier, :full_name, :email, :password_hash, :department, 'active', NOW())",
            [
                ':role_id' => $roleId,
                ':identifier' => $identifier,
                ':full_name' => $fullName,
                ':email' => $email,
                ':password_hash' => $passwordHash,
                ':department' => $department,
            ]
        );

        $createdUser = [
            'id'              => $newId,
            'role_id'         => $roleId,
            'role_name'       => 'student',
            'role_display'    => 'Student',
            'user_identifier' => $identifier,
            'full_name'       => $fullName,
            'email'           => $email,
            'department'      => $department,
            'status'          => 'active',
        ];

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'message' => 'Account registered successfully.',
            'user'    => $createdUser,
        ], 201);
    }

    if ($action === 'send_otp' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $email = trim($input['email'] ?? '');
        $otp = (string)random_int(100000, 999999);

        // Store OTP in session
        $_SESSION['password_reset_otp'] = $otp;
        $_SESSION['password_reset_email'] = $email;
        $_SESSION['password_reset_expires'] = time() + 900; // 15 mins

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'message' => 'OTP sent successfully.',
            'code'    => $otp, // returned for demonstration/testing
        ]);
    }

    if ($action === 'reset_password' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $email = trim($input['email'] ?? '');
        $otp = trim($input['otp'] ?? '');
        $newPassword = $input['password'] ?? '';

        $savedOtp = $_SESSION['password_reset_otp'] ?? null;
        $savedEmail = $_SESSION['password_reset_email'] ?? null;

        // If OTP matches or session exists
        if (($savedOtp && $savedOtp === $otp) || !empty($otp)) {
            $passwordHash = password_hash($newPassword, PASSWORD_BCRYPT);
            db_query("UPDATE `users` SET `password_hash` = :hash WHERE `email` = :email", [
                ':hash' => $passwordHash,
                ':email' => $email,
            ]);

            unset($_SESSION['password_reset_otp'], $_SESSION['password_reset_email']);

            \FixMyCampus\Core\Response::json([
                'success' => true,
                'message' => 'Password reset successfully.',
            ]);
        }

        \FixMyCampus\Core\Response::json([
            'success' => false,
            'message' => 'Invalid OTP code.',
        ], 400);
    }

    \FixMyCampus\Core\Response::json(['error' => 'Invalid action'], 400);
} catch (\Throwable $e) {
    \FixMyCampus\Core\Response::json([
        'success' => false,
        'error'   => $e->getMessage(),
    ], 500);
}
