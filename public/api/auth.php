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
require_once SRC_PATH . '/Core/RateLimiter.php';
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
        $user = auth_user();
        if (auth_check() && !empty($user['id'])) {
            $fresh = db_fetch_one("
                SELECT u.id, u.role_id, u.user_identifier, u.first_name, u.middle_name, u.last_name, u.full_name,
                       u.email, u.phone_number, u.department, u.year_level, u.avatar_url, u.status,
                       r.name as role_name, r.display_name as role_display
                FROM `users` u
                JOIN `roles` r ON u.role_id = r.id
                WHERE u.id = :id
                LIMIT 1
            ", [':id' => $user['id']]);
            if ($fresh) {
                unset($fresh['password_hash']);
                $user = $fresh;
                session_set('user', $user);
            }
        }
        \FixMyCampus\Core\Response::json([
            'authenticated' => auth_check(),
            'user'          => $user,
        ]);
    }

    // --------------------------------------------------------------------------
    // Action: verify_admin -> Server-side RBAC check for Administrator privileges
    // Returns HTTP 401 if unauthenticated, HTTP 403 if non-admin, HTTP 200 if admin
    // --------------------------------------------------------------------------
    if ($action === 'verify_admin') {
        if (!auth_check()) {
            \FixMyCampus\Core\Response::json([
                'success'       => false,
                'authorized'    => false,
                'error_code'    => 'UNAUTHENTICATED',
                'message'       => 'Authentication required. Please sign in.',
            ], 401);
        }

        if (!auth_is_admin()) {
            \FixMyCampus\Core\Response::json([
                'success'       => false,
                'authorized'    => false,
                'error_code'    => 'FORBIDDEN',
                'message'       => 'Access Denied: Administrator privileges required.',
                'current_role'  => auth_role() ?? 'student',
                'required_role' => 'admin',
            ], 403);
        }

        \FixMyCampus\Core\Response::json([
            'success'    => true,
            'authorized' => true,
            'user'       => auth_user(),
        ]);
    }

    if ($action === 'update_avatar' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!auth_check()) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Unauthorized. Please sign in.',
            ], 401);
        }

        $userId = auth_id();
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $avatarUrl = $input['avatar_url'] ?? '';

        // Handle uploaded file if present
        if (isset($_FILES['avatar']) && $_FILES['avatar']['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES['avatar'];
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
            if (!in_array($ext, $allowed, true)) {
                \FixMyCampus\Core\Response::json([
                    'success' => false,
                    'message' => 'Invalid file format. Please upload JPG, PNG, WEBP, or GIF.',
                ], 400);
            }
            $uploadDir = dirname(__DIR__) . '/uploads/avatars';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            $filename = 'avatar_' . $userId . '_' . time() . '.' . $ext;
            $destination = $uploadDir . '/' . $filename;
            if (move_uploaded_file($file['tmp_name'], $destination)) {
                $avatarUrl = '/uploads/avatars/' . $filename;
            }
        } elseif (!empty($avatarUrl) && str_starts_with($avatarUrl, 'data:image/')) {
            // Base64 data URL
            if (preg_match('/^data:image\/(\w+);base64,/', $avatarUrl, $type)) {
                $data = substr($avatarUrl, strpos($avatarUrl, ',') + 1);
                $type = strtolower($type[1]);
                $data = base64_decode($data);
                if ($data !== false) {
                    $uploadDir = dirname(__DIR__) . '/uploads/avatars';
                    if (!is_dir($uploadDir)) {
                        mkdir($uploadDir, 0755, true);
                    }
                    $filename = 'avatar_' . $userId . '_' . time() . '.' . ($type === 'jpeg' ? 'jpg' : $type);
                    file_put_contents($uploadDir . '/' . $filename, $data);
                    $avatarUrl = '/uploads/avatars/' . $filename;
                }
            }
        }

        if (empty($avatarUrl)) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'No image provided.',
            ], 400);
        }

        db_query("UPDATE `users` SET `avatar_url` = :avatar, `updated_at` = NOW() WHERE `id` = :id", [
            ':avatar' => $avatarUrl,
            ':id'     => $userId,
        ]);

        $updatedUser = db_fetch_one("
            SELECT u.id, u.role_id, u.user_identifier, u.first_name, u.middle_name, u.last_name, u.full_name,
                   u.email, u.phone_number, u.department, u.year_level, u.avatar_url, u.status,
                   r.name as role_name, r.display_name as role_display
            FROM `users` u
            JOIN `roles` r ON u.role_id = r.id
            WHERE u.id = :id
            LIMIT 1
        ", [':id' => $userId]);

        if ($updatedUser) {
            unset($updatedUser['password_hash']);
            session_set('user', $updatedUser);
        }

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'message' => 'Profile picture updated successfully.',
            'avatar_url' => $avatarUrl,
            'user' => $updatedUser,
        ]);
    }

    if ($action === 'update_profile' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!auth_check()) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Unauthorized. Please sign in.',
            ], 401);
        }

        $userId = auth_id();
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $firstName  = trim($input['first_name'] ?? '');
        $middleName = trim($input['middle_name'] ?? '');
        $lastName   = trim($input['last_name'] ?? '');
        $yearLevel  = trim($input['year_level'] ?? '');
        $department = trim($input['department'] ?? '');

        // Compose full name if parts provided
        $parts = array_filter([$firstName, $middleName, $lastName], fn($p) => $p !== '');
        $fullName = !empty($parts) ? implode(' ', $parts) : trim($input['full_name'] ?? '');

        if (empty($fullName)) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'First and last name cannot be empty.',
            ], 400);
        }

        // Fetch user to check role. Maintenance staff and admin roles/departments are locked by admin
        $existingUser = db_fetch_one("SELECT u.*, r.name as role_name FROM `users` u JOIN `roles` r ON u.role_id = r.id WHERE u.id = :id LIMIT 1", [':id' => $userId]);
        $isMaintenanceOrAdmin = in_array($existingUser['role_name'] ?? '', ['admin', 'supervisor', 'technician']);

        if ($isMaintenanceOrAdmin) {
            $yearLevel  = $existingUser['year_level'] ?? null;
            $department = $existingUser['department'] ?? null;
        }

        db_query("
            UPDATE `users`
            SET `first_name` = :fn,
                `middle_name` = :mn,
                `last_name` = :ln,
                `full_name` = :full_name,
                `year_level` = :year_level,
                `department` = :department,
                `updated_at` = NOW()
            WHERE `id` = :id
        ", [
            ':fn'         => !empty($firstName) ? $firstName : null,
            ':mn'         => !empty($middleName) ? $middleName : null,
            ':ln'         => !empty($lastName) ? $lastName : null,
            ':full_name'  => $fullName,
            ':year_level' => !empty($yearLevel) ? $yearLevel : null,
            ':department' => !empty($department) ? $department : null,
            ':id'         => $userId,
        ]);

        $updatedUser = db_fetch_one("
            SELECT u.id, u.role_id, u.user_identifier, u.first_name, u.middle_name, u.last_name, u.full_name,
                   u.email, u.phone_number, u.department, u.year_level, u.avatar_url, u.status,
                   r.name as role_name, r.display_name as role_display
            FROM `users` u
            JOIN `roles` r ON u.role_id = r.id
            WHERE u.id = :id
            LIMIT 1
        ", [':id' => $userId]);

        if ($updatedUser) {
            unset($updatedUser['password_hash']);
            session_set('user', $updatedUser);
        }

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'message' => 'Profile updated successfully.',
            'user'    => $updatedUser,
        ]);
    }

    if ($action === 'change_password' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!auth_check()) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Unauthorized. Please sign in.',
            ], 401);
        }

        $userId = auth_id();
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $currentPassword = $input['current_password'] ?? '';
        $newPassword = $input['new_password'] ?? '';

        if (strlen($newPassword) < 6) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'New password must be at least 6 characters.',
            ], 400);
        }

        $user = db_fetch_one("SELECT * FROM `users` WHERE `id` = :id LIMIT 1", [':id' => $userId]);
        if (!$user) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'User not found.',
            ], 404);
        }

        // If current password provided, verify it
        if (!empty($currentPassword) && !password_verify($currentPassword, $user['password_hash'])) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Current password does not match.',
            ], 400);
        }

        $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
        db_query("UPDATE `users` SET `password_hash` = :hash, `updated_at` = NOW() WHERE `id` = :id", [
            ':hash' => $newHash,
            ':id'   => $userId,
        ]);

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'message' => 'Password updated successfully. You can now use this password to sign in via the login form.',
        ]);
    }

    if ($action === 'logout') {
        auth_logout();
        if (session_status() === PHP_SESSION_ACTIVE) {
            $_SESSION = [];
            if (ini_get("session.use_cookies")) {
                $params = session_get_cookie_params();
                setcookie(
                    session_name(),
                    '',
                    time() - 42000,
                    $params["path"],
                    $params["domain"],
                    $params["secure"],
                    $params["httponly"]
                );
            }
            session_destroy();
        }

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'message' => 'Logged out successfully.',
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

        // Rate Limiting Security Check: Verify if account/IP is locked
        $rateStatus = \FixMyCampus\Core\RateLimiter::check($loginInput);
        if ($rateStatus['is_locked']) {
            header('Retry-After: ' . $rateStatus['retry_after']);
            \FixMyCampus\Core\Response::json([
                'success'       => false,
                'error_code'    => 'RATE_LIMITED',
                'message'       => $rateStatus['message'],
                'retry_after'   => $rateStatus['retry_after'],
                'attempts_left' => 0,
            ], 429);
        }

        $user = db_fetch_one("
            SELECT u.*, r.name as role_name, r.display_name as role_display
            FROM `users` u
            JOIN `roles` r ON u.role_id = r.id
            WHERE LOWER(u.email) = LOWER(:email) OR u.user_identifier = :identifier
            LIMIT 1
        ", [':email' => $loginInput, ':identifier' => $loginInput]);

        if (!$user) {
            $failedRate = \FixMyCampus\Core\RateLimiter::recordFailedAttempt($loginInput);
            if ($failedRate['is_locked']) {
                header('Retry-After: ' . $failedRate['retry_after']);
                \FixMyCampus\Core\Response::json([
                    'success'       => false,
                    'error_code'    => 'RATE_LIMITED',
                    'message'       => $failedRate['message'],
                    'retry_after'   => $failedRate['retry_after'],
                    'attempts_left' => 0,
                ], 429);
            }

            \FixMyCampus\Core\Response::json([
                'success'       => false,
                'error_code'    => 'USER_NOT_FOUND',
                'message'       => 'No account found matching this email address or Student/Employee ID. Please verify your details or register a new account.',
                'attempts_left' => $failedRate['attempts_left'],
            ], 404);
        }

        if (!password_verify($password, $user['password_hash'])) {
            $failedRate = \FixMyCampus\Core\RateLimiter::recordFailedAttempt($loginInput);
            if ($failedRate['is_locked']) {
                header('Retry-After: ' . $failedRate['retry_after']);
                \FixMyCampus\Core\Response::json([
                    'success'       => false,
                    'error_code'    => 'RATE_LIMITED',
                    'message'       => $failedRate['message'],
                    'retry_after'   => $failedRate['retry_after'],
                    'attempts_left' => 0,
                ], 429);
            }

            \FixMyCampus\Core\Response::json([
                'success'       => false,
                'error_code'    => 'INVALID_PASSWORD',
                'message'       => 'Incorrect password. If you signed up with Google, use "Sign in with Google" or use Forgot Password to reset it.',
                'attempts_left' => $failedRate['attempts_left'],
            ], 401);
        }

        if ($user['status'] !== 'active') {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Account is not active.',
            ], 403);
        }

        // Successful authentication: Reset and clear failed attempts
        \FixMyCampus\Core\RateLimiter::clear($loginInput);

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

        // Look up user in database (case-insensitive by institutional email)
        $user = db_fetch_one("
            SELECT u.*, r.name as role_name, r.display_name as role_display
            FROM `users` u
            JOIN `roles` r ON u.role_id = r.id
            WHERE LOWER(u.email) = LOWER(:email)
            LIMIT 1
        ", [':email' => $email]);

        if ($user) {
            if ($user['status'] !== 'active') {
                \FixMyCampus\Core\Response::json([
                    'success' => false,
                    'message' => 'Your account is currently suspended or inactive. Please contact Campus Administration.',
                ], 403);
            }

            // Sync Google avatar if user has none saved yet
            if (!empty($googleUser['picture']) && empty($user['avatar_url'])) {
                db_query("UPDATE `users` SET `avatar_url` = :avatar, `updated_at` = NOW() WHERE `id` = :id", [
                    ':avatar' => $googleUser['picture'],
                    ':id'     => $user['id'],
                ]);
                $user['avatar_url'] = $googleUser['picture'];
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
            $department = 'CITE - College of Information Technology Education';

            $newId = db_insert('users', [
                'role_id'         => $roleId,
                'user_identifier' => $identifier,
                'full_name'       => $googleUser['name'],
                'email'           => $email,
                'password_hash'   => $dummyPasswordHash,
                'department'      => $department,
                'avatar_url'      => $googleUser['picture'] ?? null,
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

        // Initialize session
        auth_login($user);

        \FixMyCampus\Core\Response::json([
            'success' => true,
            'message' => 'Google institutional authentication successful.',
            'user'    => auth_user(),
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

        // Verify account exists in database
        $user = db_fetch_one("SELECT id, full_name, status FROM `users` WHERE email = :email LIMIT 1", [':email' => $email]);
        if (!$user) {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'No account found matching this institutional email address. Please make sure your account is registered first.',
            ], 404);
        }

        if (isset($user['status']) && $user['status'] !== 'active') {
            \FixMyCampus\Core\Response::json([
                'success' => false,
                'message' => 'Your account is currently inactive or suspended. Please contact Campus Administration.',
            ], 403);
        }

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
            // Verify user exists before updating
            $user = db_fetch_one("SELECT id FROM `users` WHERE email = :email LIMIT 1", [':email' => $email]);
            if (!$user) {
                \FixMyCampus\Core\Response::json([
                    'success' => false,
                    'message' => 'No registered account found matching this email address.',
                ], 404);
            }

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
        'message' => $e->getMessage(),
        'error'   => $e->getMessage(),
    ], 500);
}
