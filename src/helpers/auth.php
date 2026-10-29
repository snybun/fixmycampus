<?php

declare(strict_types=1);

/**
 * FixMyCampus Authentication & Authorization Helpers
 *
 * Handles user authentication state, role verification, and login/logout lifecycle.
 */

require_once __DIR__ . '/session.php';

if (!function_exists('auth_check')) {
    /**
     * Determine if a user is currently authenticated.
     */
    function auth_check(): bool
    {
        return session_has('user') && !empty(session_get('user')['id']);
    }
}

if (!function_exists('auth_user')) {
    /**
     * Retrieve the current authenticated user data.
     *
     * @return array|null
     */
    function auth_user(): ?array
    {
        return session_get('user');
    }
}

if (!function_exists('auth_id')) {
    /**
     * Retrieve the current authenticated user's ID.
     */
    function auth_id(): ?int
    {
        $user = auth_user();
        return isset($user['id']) ? (int)$user['id'] : null;
    }
}

if (!function_exists('auth_role')) {
    /**
     * Retrieve the role slug/name of the current authenticated user.
     * Example: 'admin', 'supervisor', 'technician', 'faculty', 'student'
     */
    function auth_role(): ?string
    {
        $user = auth_user();
        return $user['role_name'] ?? $user['role'] ?? null;
    }
}

if (!function_exists('auth_has_role')) {
    /**
     * Check if the authenticated user possesses one of the allowed roles.
     *
     * @param string|array $roles
     * @return bool
     */
    function auth_has_role(string|array $roles): bool
    {
        if (!auth_check()) {
            return false;
        }

        $currentRole = auth_role();
        if ($currentRole === null) {
            return false;
        }

        $allowed = is_array($roles) ? $roles : [$roles];
        return in_array(strtolower($currentRole), array_map('strtolower', $allowed), true);
    }
}

if (!function_exists('auth_login')) {
    /**
     * Log in a user by saving their profile in session (excluding password_hash).
     *
     * @param array $user
     */
    function auth_login(array $user): void
    {
        session_start_safe();
        // Prevent session fixation attack if session is active and headers not yet sent
        if (!headers_sent() && session_status() === PHP_SESSION_ACTIVE) {
            session_regenerate_id(true);
        }

        // Sanitize user data before storing in session
        unset($user['password_hash']);
        session_set('user', $user);
    }
}

if (!function_exists('auth_logout')) {
    /**
     * Terminate the authenticated user session.
     */
    function auth_logout(): void
    {
        session_start_safe();
        session_remove('user');
        if (!headers_sent() && session_status() === PHP_SESSION_ACTIVE) {
            session_regenerate_id(true);
        }
    }
}

if (!function_exists('auth_is_admin')) {
    /**
     * Determine if the currently logged-in user is an administrator.
     */
    function auth_is_admin(): bool
    {
        return auth_has_role('admin');
    }
}

if (!function_exists('auth_is_staff')) {
    /**
     * Determine if the currently logged-in user is campus staff (admin, supervisor, or technician).
     */
    function auth_is_staff(): bool
    {
        return auth_has_role(['admin', 'supervisor', 'technician']);
    }
}

if (!function_exists('auth_is_maintenance')) {
    function auth_is_maintenance(): bool
    {
        return auth_has_role(['supervisor', 'technician']);
    }
}

if (!function_exists('auth_require')) {
    /**
     * Require that a user is logged in. Rejects with HTTP 401 JSON for APIs, or redirects for web pages.
     */
    function auth_require(?string $redirectUrl = null): array
    {
        session_start_safe();

        if (auth_check()) {
            return auth_user();
        }

        $uri = $_SERVER['REQUEST_URI'] ?? '';
        $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
        $isApi = str_starts_with($uri, '/api') || str_contains($accept, 'application/json');

        if ($isApi) {
            http_response_code(401);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'success'    => false,
                'error_code' => 'UNAUTHENTICATED',
                'message'    => 'Authentication required. Please log in.',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            exit;
        }

        $target = $redirectUrl ?? '/#login';
        header("Location: {$target}");
        exit;
    }
}

if (!function_exists('auth_require_role')) {
    /**
     * Require that the authenticated user possesses one of the specified roles.
     * Rejects unauthorized requests with HTTP 403 Forbidden.
     *
     * @param string|array $roles Allowed role(s)
     * @param string|null $redirectUrl Optional custom redirect for web requests
     * @return array The authenticated user record
     */
    function auth_require_role(string|array $roles, ?string $redirectUrl = null): array
    {
        $user = auth_require($redirectUrl);

        if (!auth_has_role($roles)) {
            $allowedList = is_array($roles) ? implode(', ', $roles) : $roles;
            $currentRole = auth_role() ?? 'unassigned';

            $uri = $_SERVER['REQUEST_URI'] ?? '';
            $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
            $isApi = str_starts_with($uri, '/api') || str_contains($accept, 'application/json');

            if ($isApi) {
                http_response_code(403);
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode([
                    'success'       => false,
                    'error_code'    => 'FORBIDDEN',
                    'message'       => "Access Denied: You do not have the required role permissions to access this endpoint.",
                    'required_role' => $allowedList,
                    'current_role'  => $currentRole,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
                exit;
            }

            // Web Request: Render security rejection error page
            http_response_code(403);
            header('Content-Type: text/html; charset=utf-8');
            render_access_denied_page($currentRole, $allowedList);
            exit;
        }

        return $user;
    }
}

if (!function_exists('render_access_denied_page')) {
    /**
     * Render a server-side 403 Forbidden Access Denied page with FixMyCampus branding.
     */
    function render_access_denied_page(string $currentRole, string $requiredRole): void
    {
        $safeCurrent = htmlspecialchars(ucfirst($currentRole));
        $safeRequired = htmlspecialchars(ucfirst($requiredRole));
        ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>403 Forbidden &bull; FixMyCampus Security</title>
    <style>
        :root {
            --bg: #0b1120;
            --surface: #1e293b;
            --border: #334155;
            --danger: #ef4444;
            --danger-bg: rgba(239, 68, 68, 0.12);
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --accent: #3b82f6;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg);
            color: var(--text-primary);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
        }
        .card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 16px;
            max-width: 520px;
            width: 100%;
            padding: 2.5rem;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .icon-box {
            width: 64px;
            height: 64px;
            background: var(--danger-bg);
            border: 2px solid rgba(239, 68, 68, 0.3);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
            color: var(--danger);
        }
        h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.5rem; }
        .subtitle { color: var(--danger); font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; }
        p { color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem; }
        .role-badge {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 0.75rem 1rem;
            font-size: 0.85rem;
            margin-bottom: 1.75rem;
            display: flex;
            justify-content: space-around;
        }
        .role-item { display: flex; flex-direction: column; gap: 0.25rem; }
        .role-label { color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; }
        .role-val { font-weight: 600; color: var(--text-primary); }
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: var(--accent);
            color: #ffffff;
            font-weight: 600;
            font-size: 0.9rem;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            text-decoration: none;
            transition: opacity 0.15s;
        }
        .btn:hover { opacity: 0.9; }
        .footer-note { margin-top: 1.5rem; font-size: 0.75rem; color: #64748b; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon-box">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
        </div>
        <div class="subtitle">403 &bull; Access Forbidden</div>
        <h1>Administrator Privileges Required</h1>
        <p>Your institutional account does not have sufficient role permissions to access this administrative section. All actions are monitored and restricted according to campus security policy.</p>
        <div class="role-badge">
            <div class="role-item">
                <span class="role-label">Your Role</span>
                <span class="role-val"><?= $safeCurrent ?></span>
            </div>
            <div class="role-item">
                <span class="role-label">Required Role</span>
                <span class="role-val" style="color: #60a5fa;"><?= $safeRequired ?></span>
            </div>
        </div>
        <a href="/#dashboard" class="btn">Return to Student Dashboard</a>
        <div class="footer-note">FixMyCampus &bull; PHINMA Education Facility Management System</div>
    </div>
</body>
</html>
        <?php
    }
}
