<?php

declare(strict_types=1);

/**
 * FixMyCampus Flash Messages Partial
 * Renders queued session notifications.
 */

$flashList = $flashes ?? get_flashes();
if (!empty($flashList)): ?>
    <div class="flash-container" role="region" aria-label="Notifications">
        <?php foreach ($flashList as $flash): 
            $typeClass = match ($flash['type'] ?? 'info') {
                'success' => 'flash-success',
                'error', 'danger' => 'flash-error',
                'warning' => 'flash-warning',
                default   => 'flash-info',
            };
        ?>
            <div class="flash-alert <?= e_attr($typeClass) ?>" role="alert">
                <div class="flash-message">
                    <?= e($flash['message'] ?? '') ?>
                </div>
                <button type="button" class="flash-close" aria-label="Dismiss notification">&times;</button>
            </div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>
