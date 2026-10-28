<?php

declare(strict_types=1);

use FixMyCampus\Core\Response;

require_once dirname(__DIR__, 2) . '/src/config/app.php';
require_once SRC_PATH . '/Core/Response.php';
require_once SRC_PATH . '/helpers/auth.php';
require_once SRC_PATH . '/helpers/db.php';
require_once SRC_PATH . '/helpers/notifications.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$user = auth_require();
$userId = (int)$user['id'];
$method = $_SERVER['REQUEST_METHOD'];

function feedback_record(int $reportId): ?array
{
    $feedback = db_fetch_one('
        SELECT f.id, f.report_id, f.user_id, f.rating, f.comments, f.created_at,
               u.full_name AS reporter_name
        FROM report_feedback f JOIN users u ON u.id = f.user_id
        WHERE f.report_id = :report_id
    ', [':report_id' => $reportId]);
    if ($feedback) {
        $feedback['rating'] = (int)$feedback['rating'];
    }
    return $feedback;
}

try {
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        if (!is_array($input)) {
            Response::json(['success' => false, 'message' => 'Invalid feedback request.'], 400);
        }
        $reportId = filter_var($input['report_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $rating = $input['rating'] ?? null;
        $comments = $input['comments'] ?? '';
        if (!$reportId || is_bool($input['report_id'] ?? null)) {
            Response::json(['success' => false, 'message' => 'A valid report is required.'], 400);
        }
        if ((!is_int($rating) && !is_string($rating)) || !preg_match('/^[1-5]$/D', (string)$rating)) {
            Response::json(['success' => false, 'message' => 'Choose a whole-number rating from 1 to 5 stars.'], 422);
        }
        if (!is_string($comments) || mb_strlen(trim($comments)) > 2000) {
            Response::json(['success' => false, 'message' => 'Feedback must be text of no more than 2,000 characters.'], 422);
        }
        $comments = trim($comments);

        // Serialize feedback and report changes; the unique report_id also prevents duplicates.
        $connection = db();
        $connection->beginTransaction();
        $report = db_fetch_one('SELECT id, reporter_id, status, ticket_number FROM reports WHERE id = :id FOR UPDATE', [':id' => $reportId]);
        if (!$report) {
            db()->rollBack();
            Response::json(['success' => false, 'message' => 'Report not found.'], 404);
        }
        if ((int)$report['reporter_id'] !== $userId) {
            db()->rollBack();
            Response::json(['success' => false, 'message' => 'Only the original reporter can leave feedback.'], 403);
        }
        if (!in_array($report['status'], ['resolved', 'closed'], true)) {
            db()->rollBack();
            Response::json(['success' => false, 'message' => 'Feedback is available after the repair is completed.'], 409);
        }
        if (feedback_record((int)$reportId)) {
            db()->rollBack();
            Response::json(['success' => false, 'error_code' => 'FEEDBACK_EXISTS', 'message' => 'You have already submitted feedback for this report.'], 409);
        }
        db_insert('report_feedback', [
            'report_id' => $reportId,
            'user_id' => $userId,
            'rating' => (int)$rating,
            'comments' => $comments !== '' ? $comments : null,
        ]);
        $feedback = feedback_record((int)$reportId);
        db()->commit();

        // Notification failure must not turn a saved rating into a failed submission.
        try {
            $recipients = db_fetch_all("
                SELECT u.id FROM users u JOIN roles role ON role.id = u.role_id
                WHERE u.status = 'active' AND (role.name = 'admin' OR EXISTS (
                    SELECT 1 FROM report_assignments a WHERE a.report_id = :rid AND a.assigned_to = u.id
                ))
            ", [':rid' => $reportId]);
            foreach ($recipients as $recipient) {
                create_notification((int)$recipient['id'], (int)$reportId, 'feedback',
                    "New feedback: {$report['ticket_number']}",
                    "The reporter rated this repair {$rating} out of 5 stars. View the feedback in your dashboard.");
            }
        } catch (Throwable $error) {
            error_log('[Feedback notification] ' . $error->getMessage());
        }
        Response::json(['success' => true, 'data' => $feedback, 'can_submit' => false, 'message' => 'Thank you! Your feedback has been submitted.'], 201);
    }

    if ($method !== 'GET') {
        Response::json(['success' => false, 'message' => 'Method not allowed.'], 405, ['Allow' => 'GET, POST']);
    }

    if (array_key_exists('report_id', $_GET)) {
        $reportId = filter_var($_GET['report_id'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if (!$reportId) {
            Response::json(['success' => false, 'message' => 'A valid report is required.'], 400);
        }
        $report = db_fetch_one('SELECT reporter_id, status FROM reports WHERE id = :id', [':id' => $reportId]);
        if (!$report) {
            Response::json(['success' => false, 'message' => 'Report not found.'], 404);
        }
        $isReporter = (int)$report['reporter_id'] === $userId;
        $isAssigned = auth_is_maintenance() && db_fetch_one(
            'SELECT id FROM report_assignments WHERE report_id = :rid AND assigned_to = :uid LIMIT 1',
            [':rid' => $reportId, ':uid' => $userId]
        );
        if (!$isReporter && !auth_is_admin() && !$isAssigned) {
            Response::json(['success' => false, 'message' => 'You do not have access to this feedback.'], 403);
        }
        $feedback = feedback_record((int)$reportId);
        Response::json([
            'success' => true, 'data' => $feedback,
            'can_submit' => $isReporter && !$feedback && in_array($report['status'], ['resolved', 'closed'], true),
            'is_reporter' => $isReporter,
        ]);
    }

    auth_require_role(['admin', 'supervisor', 'technician']);
    $params = [];
    $where = '1 = 1';
    if (!auth_is_admin()) {
        $where = 'EXISTS (SELECT 1 FROM report_assignments a WHERE a.report_id = f.report_id AND a.assigned_to = :uid)';
        $params[':uid'] = $userId;
    }

    // Base summary stats
    $baseSummary = db_fetch_one("SELECT COUNT(*) AS total, AVG(f.rating) AS average_rating FROM report_feedback f JOIN reports r ON r.id = f.report_id JOIN users u ON u.id = f.user_id WHERE {$where}", $params);
    $allTotal = (int)($baseSummary['total'] ?? 0);
    $allAverage = $allTotal ? round((float)$baseSummary['average_rating'], 1) : null;

    // Rating distribution
    $distribution = [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0];
    $distRows = db_fetch_all("SELECT f.rating, COUNT(*) as cnt FROM report_feedback f JOIN reports r ON r.id = f.report_id JOIN users u ON u.id = f.user_id WHERE {$where} GROUP BY f.rating", $params);
    foreach ($distRows as $dr) {
        $rKey = (int)$dr['rating'];
        if (isset($distribution[$rKey])) {
            $distribution[$rKey] = (int)$dr['cnt'];
        }
    }

    // Optional rating filter
    if (isset($_GET['rating']) && preg_match('/^[1-5]$/D', (string)$_GET['rating'])) {
        $where .= ' AND f.rating = :rating_filter';
        $params[':rating_filter'] = (int)$_GET['rating'];
    }

    // Optional search filter
    if (!empty($_GET['search'])) {
        $search = trim($_GET['search']);
        $where .= " AND (r.ticket_number LIKE :search OR r.title LIKE :search OR u.full_name LIKE :search OR f.comments LIKE :search)";
        $params[':search'] = "%{$search}%";
    }

    $filteredCountRow = db_fetch_one("SELECT COUNT(*) AS total FROM report_feedback f JOIN reports r ON r.id = f.report_id JOIN users u ON u.id = f.user_id WHERE {$where}", $params);
    $total = (int)($filteredCountRow['total'] ?? 0);
    $limit = max(1, min(50, (int)($_GET['limit'] ?? 10)));
    $totalPages = max(1, (int)ceil($total / $limit));
    $page = min($totalPages, max(1, (int)($_GET['page'] ?? 1)));
    $offset = ($page - 1) * $limit;
    $feedback = db_fetch_all("
        SELECT f.id, f.report_id, f.rating, f.comments, f.created_at,
               r.ticket_number, r.title AS report_title, r.status AS report_status,
               u.full_name AS reporter_name, u.email AS reporter_email,
               w.full_name AS worker_name
        FROM report_feedback f
        JOIN reports r ON r.id = f.report_id
        JOIN users u ON u.id = f.user_id
        LEFT JOIN report_assignments ra ON ra.report_id = r.id
        LEFT JOIN users w ON w.id = ra.assigned_to
        WHERE {$where}
        ORDER BY f.created_at DESC, f.id DESC LIMIT {$limit} OFFSET {$offset}
    ", $params);
    foreach ($feedback as &$item) {
        $item['rating'] = (int)$item['rating'];
    }
    unset($item);
    Response::json([
        'success' => true,
        'data' => $feedback,
        'summary' => [
            'total' => $allTotal,
            'average_rating' => $allAverage,
            'filtered_total' => $total,
            'distribution' => $distribution,
        ],
        'pagination' => ['page' => $page, 'total_pages' => $totalPages, 'total' => $total, 'limit' => $limit],
    ]);
} catch (Throwable $error) {
    if (isset($connection) && $connection->inTransaction()) {
        $connection->rollBack();
    }
    error_log('[Feedback API] ' . $error->getMessage());
    Response::json(['success' => false, 'message' => 'Unable to load or save feedback. Please try again.'], 500);
}
