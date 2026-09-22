<?php

declare(strict_types=1);

/**
 * FixMyCampus Database Helper Functions
 * Provides shorthand functions for database queries, fetches, and transactions.
 */

use FixMyCampus\Core\Database;

if (!function_exists('db')) {
    /**
     * Get active PDO connection.
     */
    function db(): PDO
    {
        return Database::getConnection();
    }
}

if (!function_exists('db_query')) {
    /**
     * Execute a parameterized SQL statement.
     *
     * @param string $sql
     * @param array $params
     * @return PDOStatement
     */
    function db_query(string $sql, array $params = []): PDOStatement
    {
        $pdo = db();
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }
}

if (!function_exists('db_fetch_one')) {
    /**
     * Execute query and return a single row as associative array, or null if none.
     *
     * @param string $sql
     * @param array $params
     * @return array|null
     */
    function db_fetch_one(string $sql, array $params = []): ?array
    {
        $stmt = db_query($sql, $params);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result !== false ? $result : null;
    }
}

if (!function_exists('db_fetch_all')) {
    /**
     * Execute query and return all matching rows as an array of associative arrays.
     *
     * @param string $sql
     * @param array $params
     * @return array
     */
    function db_fetch_all(string $sql, array $params = []): array
    {
        $stmt = db_query($sql, $params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}

if (!function_exists('db_fetch_column')) {
    /**
     * Execute query and return a single scalar value.
     *
     * @param string $sql
     * @param array $params
     * @param int $columnIndex
     * @return mixed
     */
    function db_fetch_column(string $sql, array $params = [], int $columnIndex = 0): mixed
    {
        $stmt = db_query($sql, $params);
        return $stmt->fetchColumn($columnIndex);
    }
}

if (!function_exists('db_insert')) {
    /**
     * Execute an INSERT query and return the last insert ID.
     *
     * @param string $sql
     * @param array $params
     * @return int
     */
    function db_insert(string $sql, array $params = []): int
    {
        $pdo = db();
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return (int) $pdo->lastInsertId();
    }
}

if (!function_exists('db_execute')) {
    /**
     * Execute an UPDATE/DELETE/DDL query and return affected rows.
     *
     * @param string $sql
     * @param array $params
     * @return int
     */
    function db_execute(string $sql, array $params = []): int
    {
        $stmt = db_query($sql, $params);
        return $stmt->rowCount();
    }
}
