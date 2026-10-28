<?php
declare(strict_types=1);

/**
 * Real-endpoint feedback regression tests.
 * Run: docker compose exec -T app php tests/feedback.php
 * Requires an empty fmc_feedback_test database granted to the app user.
 * Uses only synthetic records; never writes to the application database.
 */
const TEST_DATABASE = 'fmc_feedback_test';
require_once dirname(__DIR__) . '/src/config/app.php';
require_once SRC_PATH . '/helpers/db.php';
require_once SRC_PATH . '/helpers/auth.php';

if (($argv[1] ?? '') === '--request') {
    putenv('DB_DATABASE=' . TEST_DATABASE);
    $request = json_decode($argv[2], true, 512, JSON_THROW_ON_ERROR);
    $_GET = $request['query'];
    $_POST = $request['body'];
    $_SERVER['REQUEST_METHOD'] = $request['method'];
    $_SERVER['REQUEST_URI'] = '/api/' . $request['endpoint'] . '.php';
    $_SERVER['HTTP_ACCEPT'] = 'application/json';
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
    if (!$condition) throw new RuntimeException($message);
    echo "PASS: {$message}\n";
}

function startRequest(int $user, array $query = [], array $body = [], string $method = 'GET', string $endpoint = 'feedback'): array
{
    $process = proc_open([PHP_BINARY, __FILE__, '--request', json_encode(compact('endpoint', 'user', 'query', 'body', 'method'))], [
        0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w'],
    ], $pipes);
    fclose($pipes[0]);
    return [$process, $pipes];
}

function finishRequest(array $pending): array
{
    [$process, $pipes] = $pending;
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

function requestApi(int $user, array $query = [], array $body = [], string $method = 'GET', string $endpoint = 'feedback'): array
{
    return finishRequest(startRequest($user, $query, $body, $method, $endpoint));
}

$pdo = db();
if ($pdo->query('SELECT DATABASE()')->fetchColumn() === TEST_DATABASE) {
    throw new RuntimeException('Start with the normal application configuration.');
}
$pdo->exec('USE `' . TEST_DATABASE . '`');
if ($pdo->query('SHOW TABLES')->fetchColumn() !== false) {
    throw new RuntimeException('Test database must be empty; refusing to modify existing tables.');
}
echo "Verified fmc_feedback_test is empty before creating test tables.\n";
$schemaSql = file_get_contents(APP_ROOT . '/database/init/01_schema.sql');
preg_match_all('/CREATE TABLE (?:IF NOT EXISTS )?`(\w+)`/', $schemaSql, $tableMatches);
$createdTables = $tableMatches[1];

try {
    $pdo->exec($schemaSql);
    $pdo->exec("INSERT INTO roles (id, name, display_name) VALUES
        (1, 'admin', 'Admin'), (2, 'supervisor', 'Supervisor'), (3, 'technician', 'Technician'),
        (4, 'faculty', 'Faculty'), (5, 'student', 'Student')");
    foreach ([1 => 1, 2 => 3, 3 => 2, 4 => 3, 5 => 5, 6 => 4] as $id => $role) {
        db_insert('users', ['id' => $id, 'role_id' => $role, 'user_identifier' => "TEST-{$id}",
            'full_name' => "Test User {$id}", 'email' => "test{$id}@example.invalid", 'password_hash' => 'unusable']);
    }
    db_insert('categories', ['id' => 1, 'name' => 'Test', 'slug' => 'test']);
    db_insert('buildings', ['id' => 1, 'code' => 'TEST', 'name' => 'Test Building']);
    db_insert('locations', ['id' => 1, 'building_id' => 1, 'name' => 'Test Room']);
    foreach ([101 => [5, 2, 'resolved'], 102 => [5, 2, 'in_progress'], 103 => [6, 3, 'closed'],
              104 => [5, 2, 'submitted'], 105 => [5, 3, 'resolved'], 106 => [5, 2, 'resolved']] as $id => [$reporter, $worker, $status]) {
        db_insert('reports', ['id' => $id, 'ticket_number' => "TEST-{$id}", 'reporter_id' => $reporter,
            'category_id' => 1, 'location_id' => 1, 'title' => "Test repair {$id}", 'description' => 'Synthetic test', 'status' => $status]);
        db_insert('report_assignments', ['report_id' => $id, 'assigned_to' => $worker, 'assigned_by' => 1]);
    }
    db_insert('report_confirmations', ['report_id' => 101, 'user_id' => 6]);

    [$status] = requestApi(0, ['report_id' => 101]);
    check($status === 401, 'feedback requires authentication');
    [$status, $data] = requestApi(5, ['report_id' => 101]);
    check($status === 200 && $data['can_submit'] && $data['data'] === null, 'completed repair opens the reporter rating form');
    foreach ([102, 104] as $id) {
        [$status] = requestApi(5, [], ['report_id' => $id, 'rating' => 5], 'POST');
        check($status === 409, "unfinished repair {$id} cannot be reviewed");
    }
    foreach ([1, 2, 6] as $actor) {
        [$status] = requestApi($actor, [], ['report_id' => 101, 'rating' => 5, 'user_id' => 5], 'POST');
        check($status === 403, "user {$actor} cannot review on behalf of the reporter, even with spoofed user_id");
    }
    foreach ([0, 6, -1, 1.5, true, '5.0', '4x', [], null] as $rating) {
        [$status] = requestApi(5, [], ['report_id' => 105, 'rating' => $rating], 'POST');
        check($status === 422, 'invalid rating rejected: ' . json_encode($rating));
    }
    foreach ([str_repeat('x', 2001), ['invalid']] as $comments) {
        [$status] = requestApi(5, [], ['report_id' => 105, 'rating' => 5, 'comments' => $comments], 'POST');
        check($status === 422, 'invalid or oversized comment rejected');
    }
    check((int)db_fetch_column('SELECT COUNT(*) FROM report_feedback') === 0, 'rejected requests leave feedback empty');
    [$status, $data] = requestApi(5, [], ['report_id' => 101, 'rating' => 5, 'comments' => "  Quick repair.\nWiFi works again!  ", 'user_id' => 6], 'POST');
    check($status === 201 && $data['data']['rating'] === 5 && (int)$data['data']['user_id'] === 5
        && $data['data']['comments'] === "Quick repair.\nWiFi works again!", 'rating and multiline feedback persist under the authenticated reporter');
    [$status] = requestApi(5, [], ['report_id' => 101, 'rating' => 1, 'comments' => 'Overwrite'], 'POST');
    check($status === 409 && (int)db_fetch_column('SELECT rating FROM report_feedback WHERE report_id = 101') === 5, 'duplicate feedback cannot replace the original');
    [$status, $data] = requestApi(5, ['report_id' => 101]);
    check($status === 200 && !$data['can_submit'] && $data['data']['rating'] === 5, 'saved review is returned after reloading');
    foreach ([1, 2] as $actor) {
        [$status, $data] = requestApi($actor, ['report_id' => 101]);
        check($status === 200 && $data['data']['rating'] === 5 && !$data['can_submit'], "user {$actor} can read but cannot submit reporter feedback");
    }
    foreach ([3, 4, 6] as $actor) {
        [$status] = requestApi($actor, ['report_id' => 101, 'user_id' => 5]);
        check($status === 403, "unrelated user {$actor} cannot read private report feedback");
    }
    [$status] = requestApi(5);
    check($status === 403, 'reporter cannot access the staff feedback feed');
    [$status] = requestApi(5, ['report_id' => 99999]);
    check($status === 404, 'missing report returns not found');

    [$status] = requestApi(2, ['action' => 'update_status'], ['report_id' => 102, 'status' => 'resolved', 'remarks' => 'Finished repair'], 'POST', 'reports');
    check($status === 200, 'assigned worker completes a real report through the existing workflow');
    [$status] = requestApi(5, [], ['report_id' => 102, 'rating' => 4, 'comments' => 'Fixed'], 'POST');
    check($status === 201, 'reporter can review after worker completion');
    [$status] = requestApi(6, [], ['report_id' => 103, 'rating' => 1, 'comments' => 'Needs improvement'], 'POST');
    check($status === 201, 'faculty reporter can review a closed repair');
    [$status, $data] = requestApi(1, ['limit' => 1, 'page' => 2]);
    check($status === 200 && $data['summary']['total'] === 3 && $data['summary']['average_rating'] == 3.3
        && count($data['data']) === 1 && $data['pagination']['total_pages'] === 3, 'admin feed shows all feedback with global summary and pagination');
    [$status, $data] = requestApi(2, ['user_id' => 3, 'worker_id' => 3, 'assigned_to' => 3]);
    check($status === 200 && $data['summary']['total'] === 2 && $data['summary']['average_rating'] == 4.5
        && array_diff(array_column($data['data'], 'report_id'), [101, 102]) === [], 'maintenance feed and average use session assignments despite spoofed filters');
    [$status, $data] = requestApi(3);
    check($status === 200 && $data['summary']['total'] === 1 && (int)$data['data'][0]['report_id'] === 103, 'supervisor sees only feedback for their assigned repair');
    [$status, $data] = requestApi(4);
    check($status === 200 && $data['data'] === [] && $data['summary']['average_rating'] === null, 'unassigned maintenance sees an honest empty state');
    check((int)db_fetch_column("SELECT COUNT(*) FROM notifications WHERE report_id = 101 AND type = 'feedback' AND user_id IN (1, 2)") === 2,
        'admin and assigned worker receive feedback notifications');
    check((int)db_fetch_column("SELECT COUNT(*) FROM notifications WHERE report_id = 101 AND type = 'feedback' AND user_id IN (3, 4, 6)") === 0,
        'unrelated users do not receive feedback notifications');
    [$status, $data] = requestApi(5, [], ['report_id' => 105, 'rating' => 2], 'POST');
    check($status === 201 && $data['data']['comments'] === null, 'star-only feedback is supported');

    $first = startRequest(5, [], ['report_id' => 106, 'rating' => 4], 'POST');
    $second = startRequest(5, [], ['report_id' => 106, 'rating' => 5], 'POST');
    $statuses = [finishRequest($first)[0], finishRequest($second)[0]];
    sort($statuses);
    check($statuses === [201, 409] && (int)db_fetch_column('SELECT COUNT(*) FROM report_feedback WHERE report_id = 106') === 1,
        'concurrent submissions create exactly one review');
    echo "All feedback integration checks passed.\n";
} finally {
    if ($pdo->query('SELECT DATABASE()')->fetchColumn() !== TEST_DATABASE) {
        throw new RuntimeException('Refusing cleanup outside the test database.');
    }
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
    foreach ($createdTables as $table) {
        if (preg_match('/^[a-zA-Z0-9_]+$/', $table)) $pdo->exec('DROP TABLE IF EXISTS `' . TEST_DATABASE . '`.`' . $table . '`');
    }
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
}
