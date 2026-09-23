<?php

declare(strict_types=1);

/**
 * FixMyCampus Database Query & Transaction Helpers
 *
 * Provides a functional, safe interface for executing prepared SQL statements,
 * fetching records, and handling transactions via the singleton PDO instance.
 */

use FixMyCampus\Core\Database;

// Ensure Core Database singleton is loaded
require_once dirname(__DIR__) . '/Core/Database.php';

if (!function_exists('db')) {
    /**
     * Get the active PDO database connection instance.
     *
     * @return PDO
     * @throws Exception
     */
    function db(): PDO
    {
        return Database::getConnection();
    }
}

if (!function_exists('db_query')) {
    /**
     * Execute a prepared SQL query and return the statement.
     *
     * @param string $sql
     * @param array $params
     * @return PDOStatement
     * @throws Exception
     */
    function db_query(string $sql, array $params = []): PDOStatement
    {
        $stmt = db()->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }
}

if (!function_exists('db_fetch_all')) {
    /**
     * Execute a query and return all matching rows as an associative array.
     *
     * @param string $sql
     * @param array $params
     * @return array
     */
    function db_fetch_all(string $sql, array $params = []): array
    {
        return db_query($sql, $params)->fetchAll(PDO::FETCH_ASSOC);
    }
}

if (!function_exists('db_fetch_one')) {
    /**
     * Execute a query and return a single matching row (or null if none found).
     *
     * @param string $sql
     * @param array $params
     * @return array|null
     */
    function db_fetch_one(string $sql, array $params = []): ?array
    {
        $row = db_query($sql, $params)->fetch(PDO::FETCH_ASSOC);
        return $row !== false ? $row : null;
    }
}

if (!function_exists('db_fetch_column')) {
    /**
     * Execute a query and fetch a single column value from the first row.
     *
     * @param string $sql
     * @param array $params
     * @param int $columnIndex
     * @return mixed
     */
    function db_fetch_column(string $sql, array $params = [], int $columnIndex = 0): mixed
    {
        $val = db_query($sql, $params)->fetchColumn($columnIndex);
        return $val !== false ? $val : null;
    }
}

if (!function_exists('db_execute')) {
    /**
     * Execute an INSERT, UPDATE, or DELETE query and return the number of affected rows.
     *
     * @param string $sql
     * @param array $params
     * @return int
     */
    function db_execute(string $sql, array $params = []): int
    {
        return db_query($sql, $params)->rowCount();
    }
}

if (!function_exists('db_insert')) {
    /**
     * Insert an associative data array into a table and return the inserted primary key ID.
     *
     * @param string $table
     * @param array<string, mixed> $data
     * @return int
     */
    function db_insert(string $table, array $data): int
    {
        // Sanitize table name (only alphanumeric and underscore)
        $cleanTable = preg_replace('/[^a-zA-Z0-9_]/', '', $table);
        $columns = array_keys($data);
        $placeholders = array_map(fn($col) => ":{$col}", $columns);

        $sql = sprintf(
            'INSERT INTO `%s` (`%s`) VALUES (%s)',
            $cleanTable,
            implode('`, `', $columns),
            implode(', ', $placeholders)
        );

        $params = [];
        foreach ($data as $col => $val) {
            $params[":{$col}"] = $val;
        }

        db_query($sql, $params);
        return (int) db()->lastInsertId();
    }
}

if (!function_exists('db_last_id')) {
    /**
     * Get the last inserted auto-increment ID.
     *
     * @return string
     */
    function db_last_id(): string
    {
        return db()->lastInsertId();
    }
}

if (!function_exists('db_transaction')) {
    /**
     * Execute a callable within a database transaction.
     * Automatically rolls back on any thrown exception and commits on success.
     *
     * @param callable $callback
     * @return mixed
     * @throws Throwable
     */
    function db_transaction(callable $callback): mixed
    {
        $pdo = db();
        $pdo->beginTransaction();

        try {
            $result = $callback($pdo);
            $pdo->commit();
            return $result;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }
}
