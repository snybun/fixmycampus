<?php

declare(strict_types=1);

/**
 * FixMyCampus Minimalist Footer Component
 * Clean Apple monochrome footer with status and runtime notes.
 */
?>
<footer class="app-footer">
    <div class="footer-container">
        <div class="footer-left">
            <span>&copy; <?= date('Y') ?> <?= e($appName ?? 'FixMyCampus') ?> &bull; <?= e($appTagline ?? 'Report. Track. Improve.') ?></span>
        </div>
        <div class="footer-links">
            <a href="/health.php" target="_blank">Health API</a>
            <a href="http://localhost:8081" target="_blank" rel="noopener">phpMyAdmin</a>
            <span>PHP <?= PHP_VERSION ?></span>
        </div>
    </div>
</footer>
