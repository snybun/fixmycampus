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
        // Prevent session fixation attack
        session_regenerate_id(true);

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
        session_regenerate_id(true);
    }
}
