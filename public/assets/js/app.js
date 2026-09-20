/**
 * FixMyCampus Core Interactive Script
 * Handles mobile sidebar drawer, flash alert dismissals, and UI micro-interactions.
 */

document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------------
    // Mobile Drawer Sidebar Navigation
    // -------------------------------------------------------------------------
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('appSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    function openSidebar() {
        if (sidebar && overlay) {
            sidebar.classList.add('open');
            overlay.classList.add('active');
            if (menuToggle) {
                menuToggle.setAttribute('aria-expanded', 'true');
            }
            document.body.style.overflow = 'hidden';
        }
    }

    function closeSidebar() {
        if (sidebar && overlay) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
            if (menuToggle) {
                menuToggle.setAttribute('aria-expanded', 'false');
            }
            document.body.style.overflow = '';
        }
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (sidebar && sidebar.classList.contains('open')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });
    }

    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar && sidebar.classList.contains('open')) {
            closeSidebar();
        }
    });

    // -------------------------------------------------------------------------
    // Flash Alert Dismissals
    // -------------------------------------------------------------------------
    const flashAlerts = document.querySelectorAll('.flash-alert');

    flashAlerts.forEach((alert) => {
        const closeBtn = alert.querySelector('.flash-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                dismissAlert(alert);
            });
        }

        // Auto-dismiss after 6 seconds for success/info alerts
        if (alert.classList.contains('flash-success') || alert.classList.contains('flash-info')) {
            setTimeout(() => {
                dismissAlert(alert);
            }, 6000);
        }
    });

    function dismissAlert(alertElement) {
        alertElement.style.opacity = '0';
        alertElement.style.transform = 'translateY(-4px)';
        setTimeout(() => {
            alertElement.remove();
        }, 200);
    }
});
