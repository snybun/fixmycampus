<?php
declare(strict_types=1);

/**
 * Integration regression checks against the actual PHP endpoints.
 * Run: docker compose exec -T app php tests/maintenance_access.php
 *
 * Requires an empty fmc_maintenance_access_test database with access granted to
 * the app DB user. Only table definitions are copied from the application DB.
 * All test records and endpoint writes stay in this disposable database.
 */
const TEST_DATABASE = 'fmc_maintenance_access_test';
require_once dirname(__DIR__) . '/src/config/app.php';
require_once SRC_PATH . '/helpers/db.php';
require_once SRC_PATH . '/helpers/auth.php';
require_once SRC_PATH . '/helpers/notifications.php';

if (($argv[1] ?? '') === '--request') {
    putenv('DB_DATABASE=' . TEST_DATABASE);
    $request = json_decode($argv[2], true, 512, JSON_THROW_ON_ERROR);
    $_GET = $request['query'];
    $_POST = $request['body'];
    $_SERVER['REQUEST_METHOD'] = $request['method'];
    $_SERVER['REQUEST_URI'] = '/api/' . $request['endpoint'] . '.php';
    $_SERVER['HTTP_ACCEPT'] = 'application/json';
    $_SERVER['HTTP_X_USER_ID'] = (string)($request['query']['user_id'] ?? '');
    session_start_safe();
    if ($request['user']) {
        $_SESSION['user'] = db_fetch_one(
            'SELECT u.*, r.name AS role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = :id',
            [':id' => $request['user']]
        );
    }
    register_shutdown_function(function () {
        fwrite(STDERR, "\nHTTP_STATUS:" . (http_response_code() ?: 200));
        session_destroy();
    });
    require PUBLIC_PATH . '/api/' . $request['endpoint'] . '.php';
    exit;
}

function check(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
    echo "PASS: {$message}\n";
}

function requestApi(string $endpoint, int $user, array $query = [], array $body = [], string $method = 'GET'): array
{
    $payload = compact('endpoint', 'user', 'query', 'body', 'method');
    $process = proc_open([PHP_BINARY, __FILE__, '--request', json_encode($payload)], [
        0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w'],
    ], $pipes);
    fclose($pipes[0]);
    $output = stream_get_contents($pipes[1]);
    $errors = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $exit = proc_close($process);
    if ($exit !== 0 || !preg_match('/HTTP_STATUS:(\d+)/', $errors, $match)) {
        throw new RuntimeException("Endpoint failed: {$output}\n{$errors}");
    }
    return [(int)$match[1], json_decode($output, true, 512, JSON_THROW_ON_ERROR)];
}

$pdo = db();
$source = (string)$pdo->query('SELECT DATABASE()')->fetchColumn();
if ($source === TEST_DATABASE || !preg_match('/^[a-zA-Z0-9_]+$/', $source)) {
    throw new RuntimeException('Run with the normal application DB configured as the schema source.');
}
$tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
$pdo->exec('USE `' . TEST_DATABASE . '`');
if ($pdo->query('SHOW TABLES')->fetchColumn() !== false) {
    throw new RuntimeException('Test database must be empty; refusing to modify existing tables.');
}

try {
    foreach ($tables as $table) {
        if (!preg_match('/^[a-zA-Z0-9_]+$/', $table)) {
            throw new RuntimeException('Unexpected table name.');
        }
        $pdo->exec("CREATE TABLE `{$table}` LIKE `{$source}`.`{$table}`");
    }
    $pdo->exec("INSERT INTO roles (id, name, display_name) VALUES
        (1, 'admin', 'Admin'), (2, 'supervisor', 'Supervisor'), (3, 'technician', 'Technician'), (5, 'student', 'Student')");
    foreach ([1 => 1, 2 => 2, 3 => 3, 4 => 3, 5 => 5] as $id => $role) {
        db_insert('users', ['id' => $id, 'role_id' => $role, 'user_identifier' => "TEST-{$id}",
            'full_name' => "Test User {$id}", 'email' => "test{$id}@example.invalid", 'password_hash' => 'unusable']);
    }
    db_insert('categories', ['id' => 1, 'name' => 'Test', 'slug' => 'test']);
    db_insert('buildings', ['id' => 1, 'code' => 'TEST', 'name' => 'Test Building']);
    db_insert('locations', ['id' => 1, 'building_id' => 1, 'name' => 'Test Room', 'room_number' => '1']);
    foreach ([101 => 2, 102 => 3, 103 => null] as $id => $worker) {
        db_insert('reports', ['id' => $id, 'ticket_number' => "TEST-{$id}", 'reporter_id' => 5,
            'category_id' => 1, 'location_id' => 1, 'title' => "Test job {$id}", 'description' => 'Test only',
            'status' => $worker ? 'assigned' : 'submitted', 'priority' => 'high']);
        if ($worker) {
            db_insert('report_assignments', ['report_id' => $id, 'assigned_to' => $worker, 'assigned_by' => 1]);
        }
    }
    foreach ([[201, 2, 101], [202, 2, 102], [203, 3, 102]] as [$id, $user, $report]) {
        db_insert('notifications', ['id' => $id, 'user_id' => $user, 'report_id' => $report,
            'type' => 'work_order', 'title' => 'Test dispatch', 'message' => 'Test only']);
    }

    foreach (['reports', 'notifications'] as $endpoint) {
        [$status] = requestApi($endpoint, 0, ['user_id' => 1, 'dashboard' => 'admin']);
        check($status === 401, "{$endpoint} requires a session despite spoofed identity");
    }
    foreach ([2 => 101, 3 => 102, 4 => null] as $user => $ownJob) {
        [$status, $data] = requestApi('reports', $user, ['worker_id' => 1, 'assigned_to' => 1, 'all' => 1]);
        check($status === 200 && array_column($data['data'], 'id') == ($ownJob ? [$ownJob] : []),
            "worker {$user} sees only current assignments");
        [$status, $data] = requestApi('notifications', $user, ['user_id' => 1, 'dashboard' => 'admin', 'include_archived' => 1]);
        check($status === 200 && array_column($data['data'], 'report_id') == ($ownJob ? [$ownJob] : [])
            && $data['unread_count'] === ($ownJob ? 1 : 0), "worker {$user} alerts and counts ignore spoofed identity and stale alerts");
        if ($ownJob) {
            [$status] = requestApi('reports', $user, ['action' => 'detail', 'id' => $ownJob]);
            check($status === 200, "worker {$user} can view own job");
        }
        $foreignJob = $user === 2 ? 102 : 101;
        [$status] = requestApi('reports', $user, ['action' => 'detail', 'id' => $foreignJob]);
        check($status === 403, "worker {$user} cannot view another worker's job");
        foreach (['update_status', 'assign', 'archive', 'restore', 'delete'] as $action) {
            [$status] = requestApi('reports', $user, ['action' => $action],
                ['report_id' => $foreignJob, 'assigned_to' => $user, 'status' => 'resolved', 'changed_by' => 1], 'POST');
            check($status === 403, "worker {$user} cannot {$action} another worker's job");
        }
    }
    check(db_fetch_column('SELECT status FROM reports WHERE id = 102') === 'assigned', 'denied requests leave job unchanged');
    check((int)db_fetch_column('SELECT COUNT(*) FROM report_status_history') === 0, 'denied requests create no status history');
    [$status] = requestApi('reports', 2, ['action' => 'update_status'], ['report_id' => 103, 'status' => 'in_progress'], 'POST');
    check($status === 403, 'staff cannot start an unassigned job');
    db_insert('report_assignments', ['report_id' => 103, 'assigned_to' => 4, 'assigned_by' => 1]);
    [$status, $data] = requestApi('notifications', 4);
    check($status === 200 && $data['count'] === 2
        && array_unique(array_column($data['data'], 'report_id')) == [103],
        'initial work order and urgent alerts are seeded only for assigned jobs');

    requestApi('notifications', 2, ['action' => 'mark_read', 'id' => 203, 'user_id' => 3], [], 'POST');
    check((int)db_fetch_column('SELECT is_read FROM notifications WHERE id = 203') === 0, 'cannot mark another user notification read');
    requestApi('notifications', 2, ['action' => 'mark_all_read'], [], 'POST');
    check((int)db_fetch_column('SELECT is_read FROM notifications WHERE id = 201') === 1
        && (int)db_fetch_column('SELECT is_read FROM notifications WHERE id = 202') === 0, 'mark all only touches current assigned alerts');
    requestApi('notifications', 2, ['action' => 'archive_all', 'user_id' => 3], [], 'POST');
    check((int)db_fetch_column('SELECT is_archived FROM notifications WHERE id = 201') === 1
        && (int)db_fetch_column('SELECT SUM(is_archived) FROM notifications WHERE id IN (202, 203)') === 0, 'archive all cannot affect foreign or stale alerts');

    check(create_notification(2, 102, 'emergency', 'Foreign job', 'Test') === 0, 'notification creation rejects unrelated maintenance recipient');
    notify_admins_and_supervisors(102, 'emergency', 'Test broadcast', 'Test');
    check((int)db_fetch_column('SELECT COUNT(*) FROM notifications WHERE user_id = 2') === 2, 'management broadcast excludes unrelated supervisors');
    check((int)db_fetch_column('SELECT COUNT(*) FROM notifications WHERE user_id = 1') === 1, 'administrators still receive management alerts');

    [$status, $data] = requestApi('reports', 2, ['action' => 'update_status'],
        ['report_id' => 101, 'status' => 'in_progress', 'changed_by' => 3], 'POST');
    check($status === 200 && $data['success'], 'assigned supervisor can start own repair');
    check((int)db_fetch_column('SELECT changed_by FROM report_status_history WHERE report_id = 101 LIMIT 1') === 2,
        'audit actor comes from session, not request body');
    [$status, $data] = requestApi('reports', 1, ['action' => 'assign'],
        ['report_id' => 101, 'assigned_to' => 3, 'assigned_by' => 2], 'POST');
    check($status === 409 && $data['error_code'] === 'ASSIGNMENT_LOCKED', 'admin cannot replace an assigned worker');
    check((int)db_fetch_column('SELECT assigned_to FROM report_assignments WHERE report_id = 101') === 2, 'locked assignment retains original worker');
    check(db_fetch_column('SELECT status FROM reports WHERE id = 101') === 'in_progress', 'locked assignment retains repair status');
    db_insert('reports', ['id' => 104, 'ticket_number' => 'TEST-104', 'reporter_id' => 5,
        'category_id' => 1, 'location_id' => 1, 'title' => 'New assignment test', 'description' => 'Test only', 'status' => 'submitted']);
    [$status, $data] = requestApi('reports', 1, ['action' => 'assign'],
        ['report_id' => 104, 'assigned_to' => 3, 'assigned_by' => 2], 'POST');
    check($status === 200 && $data['success'], 'admin can assign an unassigned report');
    check((int)db_fetch_column('SELECT assigned_by FROM report_assignments WHERE report_id = 104') === 1, 'assignment actor is authenticated admin');
    $historyCount = (int)db_fetch_column('SELECT COUNT(*) FROM report_status_history');
    $notificationCount = (int)db_fetch_column('SELECT COUNT(*) FROM notifications');
    foreach ([3, 4] as $worker) {
        [$status, $data] = requestApi('reports', 1, ['action' => 'assign'],
            ['report_id' => 104, 'assigned_to' => $worker], 'POST');
        check($status === 409 && $data['error_code'] === 'ASSIGNMENT_LOCKED', 'repeat assignment is locked even for the same worker');
    }
    check((int)db_fetch_column('SELECT COUNT(*) FROM report_assignments WHERE report_id = 104') === 1, 'retries create no duplicate assignments');
    check((int)db_fetch_column('SELECT COUNT(*) FROM report_status_history') === $historyCount
        && (int)db_fetch_column('SELECT COUNT(*) FROM notifications') === $notificationCount, 'locked requests create no history or alerts');
    // Simulate an externally changed legacy assignment to retain ownership regression coverage.
    db_execute('UPDATE report_assignments SET assigned_to = 3 WHERE report_id = 101');
    [$status, $data] = requestApi('notifications', 2, ['include_archived' => 1]);
    check($status === 200 && $data['count'] === 0 && $data['unread_count'] === 0, 'reassignment immediately hides old worker alerts including archives');
    [$status] = requestApi('reports', 2, ['action' => 'update_status'], ['report_id' => 101, 'status' => 'resolved'], 'POST');
    check($status === 403, 'previous worker cannot complete reassigned job');
    [$status, $data] = requestApi('reports', 3, ['action' => 'update_status'], ['report_id' => 101, 'status' => 'resolved'], 'POST');
    check($status === 200 && $data['success'], 'new worker can complete reassigned job');
    [$status, $data] = requestApi('reports', 5, ['my_reports' => 1]);
    check($status === 200 && count($data['data']) === 4, 'reporter can still view submitted reports');
    [$status, $data] = requestApi('auth', 1, ['action' => 'update_profile'], [
        'first_name' => 'Updated', 'middle_name' => 'Campus', 'last_name' => 'Administrator',
        'user_id' => 5, 'role_id' => 5, 'department' => 'Untrusted department',
    ], 'POST');
    check($status === 200 && $data['success'] && $data['user']['full_name'] === 'Updated Campus Administrator',
        'administrator can save personal name details');
    check($data['user']['role_name'] === 'admin' && empty($data['user']['department']),
        'profile editing preserves administrator role and assigned department');
    check(db_fetch_column('SELECT full_name FROM users WHERE id = 1') === 'Updated Campus Administrator'
        && db_fetch_column('SELECT full_name FROM users WHERE id = 5') === 'Test User 5',
        'profile changes persist only for the authenticated account');
    [$status] = requestApi('auth', 0, ['action' => 'update_profile'], ['first_name' => 'No', 'last_name' => 'Session'], 'POST');
    check($status === 401, 'profile editing requires a signed-in account');
    echo "All maintenance access and administrator profile checks passed.\n";
} finally {
    // Only tables created by this run in the fixed, disposable test DB.
    foreach (array_reverse($tables) as $table) {
        if (preg_match('/^[a-zA-Z0-9_]+$/', $table)) {
            $pdo->exec('DROP TABLE IF EXISTS `' . TEST_DATABASE . "`.`{$table}`");
        }
    }
}
