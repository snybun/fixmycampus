<?php

declare(strict_types=1);

/**
 * FixMyCampus REST API - Authentication Endpoint
 * Manages session login, user profile verification, Google OAuth, and logout.
 */

require_once dirname(__DIR__, 2) . '/src/config/app.php';
require_once SRC_PATH . '/Core/Database.php';
require_once SRC_PATH . '/Core/Response.php';
require_once SRC_PATH . '/Core/Mailer.php';
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

    if ($action === 'google_config') {
        $clientId = \FixMyCampus\Core\Env::get('GOOGLE_CLIENT_ID', '');
        $allowedDomain = \FixMyCampus\Core\Env::get('GOOGLE_ALLOWED_DOMAIN', 'phinmaed.com');
        \FixMyCampus\Core\Response::json([
            'success' => true,
            'client_id' => $clientId,
            'allowed_domain' => $allowedDomain,
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

    if ($action === 'google_login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $credential = trim($input['credential'] ?? '');
        $mockEmail = trim($input['mock_email'] ?? '');
        $allowedDomain = strtolower(\FixMyCampus\Core\Env::get('GOOGLE_ALLOWED_DOMAIN', 'phinmaed.com'));

        $googleUser = null;

        if (empty($credential)) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Missing Google credential token. Please complete Google Sign-In.',
            ], 400);
        }

        // Verify Google ID Token via Google's tokeninfo endpoint
        $tokenInfoUrl = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($credential);
        $ctx = stream_context_create([
            'http' => [
                'timeout' => 5,
                'ignore_errors' => true,
            ],
        ]);
        $response = @file_get_contents($tokenInfoUrl, false, $ctx);
        if ($response === false) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Unable to connect to Google OAuth service for verification.',
            ], 502);
        }

        $payload = json_decode($response, true);
        if (!isset($payload['email'])) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => $payload['error_description'] ?? 'Invalid or expired Google token.',
            ], 401);
        }

        // Verify Google Client ID if configured
        $configuredClientId = \FixMyCampus\Core\Env::get('GOOGLE_CLIENT_ID', '');
        if (!empty($configuredClientId) && ($payload['aud'] ?? '') !== $configuredClientId) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Google Client ID mismatch.',
            ], 401);
        }

        // Ensure Google verified the email
        $isVerified = ($payload['email_verified'] === 'true' || $payload['email_verified'] === true);
        if (!$isVerified) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Your Google email address has not been verified by Google.',
            ], 403);
        }

        $googleUser = [
            'email'   => strtolower($payload['email']),
            'name'    => $payload['name'] ?? explode('@', $payload['email'])[0],
            'picture' => $payload['picture'] ?? null,
            'sub'     => $payload['sub'] ?? '',
            'hd'      => strtolower($payload['hd'] ?? ''),
        ];

        // STRICT DOMAIN RESTRICTION ENFORCEMENT:
        // Must end with @phinmaed.com
        $email = $googleUser['email'];
        $domainSuffix = '@' . $allowedDomain;
        if (!str_ends_with($email, $domainSuffix)) {
            \FixMyCampus\Core\Response::json([
                'success'    => false,
                'error_code' => 'DOMAIN_RESTRICTED',
                'message'    => "Access Restricted: FixMyCampus only accepts institutional @{$allowedDomain} Google accounts.",
            ], 403);
        }

        // Look up user in database
        $user = db_fetch_one("
            SELECT u.*, r.name as role_name, r.display_name as role_display
            FROM `users` u
            JOIN `roles` r ON u.role_id = r.id
            WHERE u.email = :email
            LIMIT 1
        ", [':email' => $email]);

        if ($user) {
            if ($user['status'] !== 'active') {
                \FixMyCampus\Core\Response::json([
                    'success' => false,
                    'message' => 'Your account is currently suspended or inactive. Please contact Campus Administration.',
                ], 403);
            }
        } else {
            // Auto-provision student user for first-time institutional Google login
            $roleId = 5; // Default role: student
            $parts = explode('@', $email);
            $cleanPrefix = strtoupper(preg_replace('/[^A-Za-z0-9_-]/', '', $parts[0]));
            $identifier = !empty($cleanPrefix) ? $cleanPrefix : 'STU-' . random_int(100000, 999999);

            // Ensure identifier uniqueness
            $existingId = db_fetch_one("SELECT id FROM `users` WHERE user_identifier = :id LIMIT 1", [':id' => $identifier]);
            if ($existingId) {
                $identifier = substr($identifier, 0, 40) . '-' . random_int(100, 999);
            }

            $dummyPasswordHash = password_hash(bin2hex(random_bytes(16)), PASSWORD_BCRYPT);
            $department = 'PHINMA Education';

            $newId = db_insert('users', [
                'role_id'         => $roleId,
                'user_identifier' => $identifier,
                'full_name'       => $googleUser['name'],
                'email'           => $email,
                'password_hash'   => $dummyPasswordHash,
                'department'      => $department,
                'status'          => 'active',
            ]);

            $user = db_fetch_one("
                SELECT u.*, r.name as role_name, r.display_name as role_display
                FROM `users` u
                JOIN `roles` r ON u.role_id = r.id
                WHERE u.id = :id
                LIMIT 1
            ", [':id' => $newId]);
        }

        // Attach avatar picture if available
        if (!empty($googleUser['picture'])) {
            $user['avatar_url'] = $googleUser['picture'];
        }

        // Initialize session
        auth_login($user);

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'message' => 'Google institutional authentication successful.',
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
        $allowedDomain = strtolower(\FixMyCampus\Core\Env::get('GOOGLE_ALLOWED_DOMAIN', 'phinmaed.com'));

        if (empty($identifier) || empty($fullName) || empty($email) || empty($password)) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'All required fields must be filled.',
            ], 400);
        }

        // Check domain policy on registration
        if (!str_ends_with(strtolower($email), '@' . $allowedDomain)) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => "Registration requires an official @{$allowedDomain} campus email address.",
            ], 403);
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
        $roleId = 5; // Default role: student

        $newId = db_insert('users', [
            'role_id'         => $roleId,
            'user_identifier' => $identifier,
            'full_name'       => $fullName,
            'email'           => $email,
            'password_hash'   => $passwordHash,
            'department'      => $department,
            'status'          => 'active',
        ]);

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
        $allowedDomain = strtolower(\FixMyCampus\Core\Env::get('GOOGLE_ALLOWED_DOMAIN', 'phinmaed.com'));

        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Please provide a valid email address.',
            ], 400);
        }

        // Institutional domain enforcement: Must be a @phinmaed.com address
        $domainSuffix = '@' . $allowedDomain;
        if (!str_ends_with(strtolower($email), $domainSuffix)) {
            \FixMyCampus\Core\Response::json([
                'success'    => false,
                'error_code' => 'DOMAIN_RESTRICTED',
                'message'    => "Access Restricted: FixMyCampus OTP verification only supports official @{$allowedDomain} institutional accounts.",
            ], 403);
        }

        // Lookup user to attach name if available
        $user = db_fetch_one("SELECT full_name FROM `users` WHERE email = :email LIMIT 1", [':email' => $email]);
        $recipientName = $user['full_name'] ?? '';

        // Generate 6-digit numeric OTP
        $otp = (string) random_int(100000, 999999);
        $expiresAtTimestamp = time() + 900; // 15 minutes
        $expiresAtDatetime = date('Y-m-d H:i:s', $expiresAtTimestamp);

        // 1. Store in session
        $_SESSION['password_reset_otp']     = $otp;
        $_SESSION['password_reset_email']   = strtolower($email);
        $_SESSION['password_reset_expires'] = $expiresAtTimestamp;

        // 2. Persist in password_resets table for cross-request durability
        try {
            db_query("CREATE TABLE IF NOT EXISTS `password_resets` (
                `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                `email` VARCHAR(100) NOT NULL,
                `otp_code` VARCHAR(10) NOT NULL,
                `expires_at` DATETIME NOT NULL,
                `is_used` TINYINT(1) NOT NULL DEFAULT 0,
                `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX `idx_pr_email` (`email`),
                INDEX `idx_pr_code` (`otp_code`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            db_insert('password_resets', [
                'email'      => strtolower($email),
                'otp_code'   => $otp,
                'expires_at' => $expiresAtDatetime,
                'is_used'    => 0,
            ]);
        } catch (\Throwable $dbEx) {
            error_log("[FixMyCampus] Failed to write to password_resets table: " . $dbEx->getMessage());
        }

        // 3. Dispatch real email via SMTP
        $mailResult = \FixMyCampus\Core\Mailer::sendOtpEmail($email, $otp, $recipientName);
        $isDebug = (bool) \FixMyCampus\Core\Env::get('APP_DEBUG', true);

        if ($mailResult['success']) {
            \FixMyCampus\Core\Response::json([
                'success' => true,
                'message' => "OTP verification code has been dispatched to your PHINMA Education inbox ({$email}). Please check your inbox or spam folder.",
                'sent_to' => $email,
            ]);
        }

        // If SMTP failed or credentials not yet configured
        error_log("[FixMyCampus] SMTP Delivery Notice: " . ($mailResult['error'] ?? 'Unknown SMTP error'));

        if ($isDebug) {
            \FixMyCampus\Core\Response::json([
                'success' => true,
                'message' => "OTP generated. (SMTP Notice: " . ($mailResult['error'] ?? 'Configure SMTP credentials in .env') . ")",
                'code'    => $otp, // provided in development fallback so testing is unblocked
                'sent_to' => $email,
            ]);
        }

        \FixMyCampus\Core\Response::json([
            'success' => false,
            'message' => "Unable to deliver OTP to {$email} via SMTP. Please verify SMTP settings in .env or contact campus IT.",
        ], 500);
    }

    if ($action === 'reset_password' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $email = strtolower(trim($input['email'] ?? ''));
        $otp = trim($input['otp'] ?? '');
        $newPassword = $input['password'] ?? '';

        if (empty($email) || empty($otp) || empty($newPassword)) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Email, OTP code, and new password are required.',
            ], 400);
        }

        if (strlen($newPassword) < 8) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'New password must be at least 8 characters long.',
            ], 400);
        }

        $isValid = false;

        // Check session first
        $savedOtp     = $_SESSION['password_reset_otp'] ?? null;
        $savedEmail   = strtolower($_SESSION['password_reset_email'] ?? '');
        $savedExpires = $_SESSION['password_reset_expires'] ?? 0;

        if ($savedOtp && $savedOtp === $otp && $savedEmail === $email && time() <= $savedExpires) {
            $isValid = true;
        }

        // If not in session, check persistent password_resets table
        if (!$isValid) {
            try {
                $dbRecord = db_fetch_one("
                    SELECT id, expires_at, is_used 
                    FROM `password_resets` 
                    WHERE email = :email AND otp_code = :otp AND is_used = 0
                    ORDER BY id DESC LIMIT 1
                ", [':email' => $email, ':otp' => $otp]);

                if ($dbRecord && strtotime($dbRecord['expires_at']) >= time()) {
                    $isValid = true;
                    db_query("UPDATE `password_resets` SET is_used = 1 WHERE id = :id", [':id' => $dbRecord['id']]);
                }
            } catch (\Throwable $e) {
                // Table might not exist yet; session check was evaluated
            }
        }

        if ($isValid) {
            $passwordHash = password_hash($newPassword, PASSWORD_BCRYPT);
            db_query("UPDATE `users` SET `password_hash` = :hash, `updated_at` = NOW() WHERE `email` = :email", [
                ':hash'  => $passwordHash,
                ':email' => $email,
            ]);

            unset($_SESSION['password_reset_otp'], $_SESSION['password_reset_email'], $_SESSION['password_reset_expires']);

            \FixMyCampus\Core\Response::json([
                'success' => true,
                'message' => 'Password reset successfully. You may now log in with your new credentials.',
            ]);
        }

        \FixMyCampus\Core\Response::json([
            'success' => false,
            'message' => 'Invalid or expired OTP verification code. Please request a new code.',
        ], 400);
    }

    \FixMyCampus\Core\Response::json(['error' => 'Invalid action'], 400);
} catch (\Throwable $e) {
    \FixMyCampus\Core\Response::json([
        'success' => false,
        'error'   => $e->getMessage(),
    ], 500);
}
