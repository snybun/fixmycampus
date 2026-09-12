<?php

namespace FixMyCampus\Core;

use PDO;
use PDOException;
use Exception;

/**
 * FixMyCampus Database Connection Manager (PDO Singleton)
 */
class Database
{
    private static ?PDO $instance = null;

    /**
     * Prevent direct instantiation
     */
    private function __construct() {}
    private function __clone() {}

    /**
     * Retrieve the active PDO database connection instance.
     *
     * @return PDO
     * @throws Exception
     */
    public static function getConnection(): PDO
    {
        if (self::$instance === null) {
            self::connect();
        }

        return self::$instance;
    }

    /**
     * Initialize connection using environment configuration.
     *
     * @throws Exception
     */
    private static function connect(): void
    {
        $host     = Env::get('DB_HOST', 'database');
        $port     = Env::get('DB_PORT', 3306);
        $dbname   = Env::get('DB_DATABASE', 'fixmycampus_db');
        $username = Env::get('DB_USERNAME', 'fmc_user');
        $password = Env::get('DB_PASSWORD', 'admin');
        $charset  = 'utf8mb4';

        $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset={$charset}";

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$charset} COLLATE {$charset}_unicode_ci",
        ];

        try {
            self::$instance = new PDO($dsn, $username, $password, $options);
        } catch (PDOException $e) {
            $isDev = Env::get('APP_DEBUG', true);
            $message = $isDev 
                ? "Database Connection Error: " . $e->getMessage() . " (Host: {$host}:{$port}, DB: {$dbname})"
                : "Database service is temporarily unavailable. Please contact the administrator.";
            
            error_log("Database Connection Error: " . $e->getMessage());
            throw new Exception($message, (int)$e->getCode(), $e);
        }
    }

    /**
     * Test the database connection and return connection metrics.
     *
     * @return array
     */
    public static function testConnection(): array
    {
        try {
            $pdo = self::getConnection();
            $serverVersion = $pdo->getAttribute(PDO::ATTR_SERVER_VERSION);
            $clientVersion = $pdo->getAttribute(PDO::ATTR_CLIENT_VERSION);
            $connectionStatus = $pdo->getAttribute(PDO::ATTR_CONNECTION_STATUS);

            // Get table counts
            $stmt = $pdo->query("SHOW TABLES");
            $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

            return [
                'status'            => 'connected',
                'database'          => Env::get('DB_DATABASE', 'fixmycampus_db'),
                'server_version'    => $serverVersion,
                'client_version'    => $clientVersion,
                'connection_status' => $connectionStatus,
                'table_count'       => count($tables),
                'tables'            => $tables,
            ];
        } catch (Exception $e) {
            return [
                'status'  => 'error',
                'message' => $e->getMessage(),
            ];
        }
    }
}
