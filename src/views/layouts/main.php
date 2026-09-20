<?php

declare(strict_types=1);

/**
 * FixMyCampus Master HTML5 Layout
 * Wraps all views in the responsive Apple monochrome design system.
 */
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="FixMyCampus - Campus Facility Defect & Maintenance Reporting System">
    <title><?= e(($pageTitle ?? 'Overview') . ' · ' . ($appName ?? 'FixMyCampus')) ?></title>
    
    <!-- Design System Stylesheet -->
    <link rel="stylesheet" href="/assets/css/app.css">
</head>
<body>
    <?php include VIEW_PATH . '/layouts/header.php'; ?>

    <div class="app-shell">
        <?php include VIEW_PATH . '/layouts/sidebar.php'; ?>

        <main class="app-content" id="mainContent">
            <?php include VIEW_PATH . '/partials/flash.php'; ?>
            <?= $content ?? '' ?>
        </main>
    </div>

    <?php include VIEW_PATH . '/layouts/footer.php'; ?>

    <!-- Interactive UI Script -->
    <script src="/assets/js/app.js"></script>
</body>
</html>
