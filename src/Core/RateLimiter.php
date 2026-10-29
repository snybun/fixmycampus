<?php

declare(strict_types=1);

namespace FixMyCampus\Core;

use PDO;
use Exception;

/**
 * FixMyCampus Authentication Rate Limiter
 *
 * Enforces security rate limiting on login attempts to protect against
 * brute-force attacks and credential stuffing.
 * Tracks attempts across both client IP address and login identifier.
 */
class RateLimiter
{
    /**
     * Maximum allowed failed attempts per account before temporary lockout.
     */
    public const MAX_ATTEMPTS = 5;

    /**
     * Maximum allowed failed attempts per IP network before temporary lockout.
     */
    public const MAX_IP_ATTEMPTS = 30;

    /**
     * Time window in seconds to track failed attempts (15 minutes).
     */
    public const WINDOW_SECONDS = 900;

    /**
     * Lockout duration in seconds once maximum attempts are reached (60 seconds).
     */
    public const LOCKOUT_SECONDS = 60;

    /**
     * Automatically ensure the database table for login attempts exists.
     */
    public static function initTable(): void
    {
        static $initialized = false;
        if ($initialized) {
            return;
        }

        try {
            $pdo = Database::getConnection();
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS `login_attempts` (
                    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    `ip_address` VARCHAR(45) NOT NULL,
                    `login_key` VARCHAR(100) NOT NULL,
                    `attempt_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    INDEX `idx_ip_time` (`ip_address`, `attempt_time`),
                    INDEX `idx_key_time` (`login_key`, `attempt_time`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ");
            $initialized = true;
        } catch (\Throwable $e) {
            error_log('[RateLimiter] Error initializing login_attempts table: ' . $e->getMessage());
        }
    }

    /**
     * Resolve the client IP address, handling proxies and local addresses.
     */
    public static function getClientIp(): string
    {
        if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
            return trim($_SERVER['HTTP_CF_CONNECTING_IP']);
        }
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            return trim($ips[0]);
        }
        return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    }

    /**
     * Check if a login attempt is allowed or currently locked out.
     *
     * @param string $loginKey Email or Student/Employee ID
     * @return array Status array with keys:
     *   - is_locked (bool): Whether the client is locked out
     *   - attempts (int): Current failed attempts in window
     *   - attempts_left (int): Remaining attempts before lockout
     *   - retry_after (int): Seconds remaining until unlock (0 if not locked)
     *   - message (string|null): Human-readable notification
     */
    public static function check(string $loginKey): array
    {
        self::initTable();

        $ip = self::getClientIp();
        $normalizedKey = strtolower(trim($loginKey));

        // 1. Session-based fast lockout check
        if (session_status() === PHP_SESSION_ACTIVE && isset($_SESSION['login_lock_until'])) {
            $sessionLock = (int)$_SESSION['login_lock_until'];
            if ($sessionLock > time()) {
                $retryAfter = $sessionLock - time();
                return [
                    'is_locked'     => true,
                    'attempts'      => self::MAX_ATTEMPTS,
                    'attempts_left' => 0,
                    'retry_after'   => $retryAfter,
                    'message'       => "Too many failed login attempts. For security, login is temporarily locked. Please try again in {$retryAfter} seconds.",
                ];
            } else {
                unset($_SESSION['login_lock_until']);
            }
        }

        // 2. Database persistent check
        try {
            $pdo = Database::getConnection();

            // Check account-specific failed attempts
            $stmtKey = $pdo->prepare("
                SELECT COUNT(*) as attempt_count, MAX(attempt_time) as latest_attempt
                FROM `login_attempts`
                WHERE login_key = :key
                  AND attempt_time > DATE_SUB(NOW(), INTERVAL " . self::WINDOW_SECONDS . " SECOND)
            ");
            $stmtKey->execute([':key' => $normalizedKey]);
            $rowKey = $stmtKey->fetch(PDO::FETCH_ASSOC);

            $keyAttempts = (int)($rowKey['attempt_count'] ?? 0);
            $keyLatest = $rowKey['latest_attempt'] ?? null;

            if ($keyAttempts >= self::MAX_ATTEMPTS && $keyLatest !== null) {
                $lastTimestamp = strtotime($keyLatest);
                $elapsed = time() - $lastTimestamp;

                if ($elapsed < self::LOCKOUT_SECONDS) {
                    $retryAfter = self::LOCKOUT_SECONDS - $elapsed;

                    if (session_status() === PHP_SESSION_ACTIVE) {
                        $_SESSION['login_lock_until'] = time() + $retryAfter;
                    }

                    return [
                        'is_locked'     => true,
                        'attempts'      => $keyAttempts,
                        'attempts_left' => 0,
                        'retry_after'   => $retryAfter,
                        'message'       => "Too many failed login attempts for this account. For security, login is temporarily locked. Please try again in {$retryAfter} seconds.",
                    ];
                } else {
                    // Lockout period expired - clear failed attempts for this key
                    self::clear($loginKey);
                    $keyAttempts = 0;
                }
            }

            // Check IP flood abuse
            $stmtIp = $pdo->prepare("
                SELECT COUNT(*) as attempt_count, MAX(attempt_time) as latest_attempt
                FROM `login_attempts`
                WHERE ip_address = :ip
                  AND attempt_time > DATE_SUB(NOW(), INTERVAL " . self::WINDOW_SECONDS . " SECOND)
            ");
            $stmtIp->execute([':ip' => $ip]);
            $rowIp = $stmtIp->fetch(PDO::FETCH_ASSOC);

            $ipAttempts = (int)($rowIp['attempt_count'] ?? 0);
            $ipLatest = $rowIp['latest_attempt'] ?? null;

            if ($ipAttempts >= self::MAX_IP_ATTEMPTS && $ipLatest !== null) {
                $lastTimestamp = strtotime($ipLatest);
                $elapsed = time() - $lastTimestamp;

                if ($elapsed < self::LOCKOUT_SECONDS) {
                    $retryAfter = self::LOCKOUT_SECONDS - $elapsed;

                    return [
                        'is_locked'     => true,
                        'attempts'      => $ipAttempts,
                        'attempts_left' => 0,
                        'retry_after'   => $retryAfter,
                        'message'       => "Too many failed login requests from your network. For security, requests are temporarily restricted. Please try again in {$retryAfter} seconds.",
                    ];
                }
            }

            $attemptsLeft = max(0, self::MAX_ATTEMPTS - $keyAttempts);

            return [
                'is_locked'     => false,
                'attempts'      => $keyAttempts,
                'attempts_left' => $attemptsLeft,
                'retry_after'   => 0,
                'message'       => null,
            ];
        } catch (\Throwable $e) {
            error_log('[RateLimiter] Check error: ' . $e->getMessage());
            return [
                'is_locked'     => false,
                'attempts'      => 0,
                'attempts_left' => self::MAX_ATTEMPTS,
                'retry_after'   => 0,
                'message'       => null,
            ];
        }
    }

    /**
     * Record a failed login attempt and return updated rate limit status.
     *
     * @param string $loginKey Email or Student/Employee ID
     * @return array
     */
    public static function recordFailedAttempt(string $loginKey): array
    {
        self::initTable();

        $ip = self::getClientIp();
        $normalizedKey = strtolower(trim($loginKey));

        try {
            $pdo = Database::getConnection();

            $stmt = $pdo->prepare("
                INSERT INTO `login_attempts` (`ip_address`, `login_key`, `attempt_time`)
                VALUES (:ip, :key, NOW())
            ");
            $stmt->execute([':ip' => $ip, ':key' => $normalizedKey]);

            // Clean up old attempt records (> 24 hours) with 10% sampling probability
            if (random_int(1, 10) === 1) {
                $pdo->exec("DELETE FROM `login_attempts` WHERE attempt_time < DATE_SUB(NOW(), INTERVAL 24 HOUR)");
            }
        } catch (\Throwable $e) {
            error_log('[RateLimiter] Record error: ' . $e->getMessage());
        }

        // Return the freshly updated rate limit state
        return self::check($loginKey);
    }

    /**
     * Clear failed attempts upon successful authentication.
     *
     * @param string $loginKey
     */
    public static function clear(string $loginKey): void
    {
        self::initTable();

        $ip = self::getClientIp();
        $normalizedKey = strtolower(trim($loginKey));

        if (session_status() === PHP_SESSION_ACTIVE) {
            unset($_SESSION['login_lock_until']);
            unset($_SESSION['login_attempts']);
        }

        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare("DELETE FROM `login_attempts` WHERE login_key = :key");
            $stmt->execute([':key' => $normalizedKey]);
        } catch (\Throwable $e) {
            error_log('[RateLimiter] Clear error: ' . $e->getMessage());
        }
    }
}
