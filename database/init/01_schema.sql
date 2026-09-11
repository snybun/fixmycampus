-- ==============================================================================
-- FixMyCampus: Facility Defect and Maintenance Reporting System
-- Tagline: "Report. Track. Improve."
-- Database Schema (MySQL 8)
-- ==============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

-- -----------------------------------------------------------------------------
-- Table: roles
-- Defines user permissions: student, faculty, technician, supervisor, admin
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `display_name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_roles_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table: users
-- Campus users including reporters (students/faculty), staff, and administrators
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `role_id` INT UNSIGNED NOT NULL,
    `user_identifier` VARCHAR(50) NOT NULL COMMENT 'Student ID, Faculty ID, or Staff Employee ID',
    `full_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `phone_number` VARCHAR(25) NULL,
    `department` VARCHAR(100) NULL,
    `status` ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_users_identifier` (`user_identifier`),
    UNIQUE KEY `uk_users_email` (`email`),
    KEY `idx_users_role_id` (`role_id`),
    CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table: categories
-- Defect and issue classification (Furniture, AC, Lighting, Plumbing, etc.)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `icon` VARCHAR(50) NULL,
    `sla_hours` INT UNSIGNED NOT NULL DEFAULT 48 COMMENT 'Target resolution SLA in hours',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_categories_name` (`name`),
    UNIQUE KEY `uk_categories_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table: buildings
-- Campus buildings and major structures
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `buildings`;
CREATE TABLE `buildings` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_buildings_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table: floors
-- Floors within campus buildings
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `floors`;
CREATE TABLE `floors` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `building_id` INT UNSIGNED NOT NULL,
    `floor_number` INT NOT NULL COMMENT 'e.g. 0 for Ground, 1 for 1st Floor, etc.',
    `floor_name` VARCHAR(50) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_building_floor` (`building_id`, `floor_number`),
    KEY `idx_floors_building_id` (`building_id`),
    CONSTRAINT `fk_floors_building` FOREIGN KEY (`building_id`) REFERENCES `buildings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table: locations
-- Specific rooms, facilities, restrooms, laboratories, and grounds
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `locations`;
CREATE TABLE `locations` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `building_id` INT UNSIGNED NOT NULL,
    `floor_id` INT UNSIGNED NULL,
    `room_number` VARCHAR(30) NULL,
    `name` VARCHAR(100) NOT NULL,
    `type` ENUM('classroom', 'restroom', 'laboratory', 'office', 'grounds', 'hallway', 'cafeteria', 'auditorium', 'other') NOT NULL DEFAULT 'other',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_locations_building_id` (`building_id`),
    KEY `idx_locations_floor_id` (`floor_id`),
    CONSTRAINT `fk_locations_building` FOREIGN KEY (`building_id`) REFERENCES `buildings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_locations_floor` FOREIGN KEY (`floor_id`) REFERENCES `floors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table: reports
-- Core defect tickets reported by users
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `reports`;
CREATE TABLE `reports` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `ticket_number` VARCHAR(30) NOT NULL,
    `reporter_id` INT UNSIGNED NOT NULL,
    `category_id` INT UNSIGNED NOT NULL,
    `location_id` INT UNSIGNED NOT NULL,
    `specific_area` VARCHAR(150) NULL COMMENT 'e.g., Near projector screen, 2nd row seat 4',
    `title` VARCHAR(150) NOT NULL,
    `description` TEXT NOT NULL,
    `priority` ENUM('low', 'medium', 'high', 'emergency') NOT NULL DEFAULT 'medium',
    `status` ENUM('submitted', 'under_review', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed', 'rejected') NOT NULL DEFAULT 'submitted',
    `reported_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_reports_ticket_number` (`ticket_number`),
    KEY `idx_reports_reporter_id` (`reporter_id`),
    KEY `idx_reports_category_id` (`category_id`),
    KEY `idx_reports_location_id` (`location_id`),
    KEY `idx_reports_status` (`status`),
    KEY `idx_reports_priority` (`priority`),
    KEY `idx_reports_reported_at` (`reported_at`),
    CONSTRAINT `fk_reports_reporter` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
    CONSTRAINT `fk_reports_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON UPDATE CASCADE,
    CONSTRAINT `fk_reports_location` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table: report_attachments
-- Photos & files for defect evidence and completion proof
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `report_attachments`;
CREATE TABLE `report_attachments` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `report_id` INT UNSIGNED NOT NULL,
    `uploaded_by` INT UNSIGNED NOT NULL,
    `file_path` VARCHAR(255) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_type` VARCHAR(50) NOT NULL,
    `file_size` INT UNSIGNED NOT NULL COMMENT 'Size in bytes',
    `attachment_stage` ENUM('initial_defect', 'in_progress', 'completion_proof') NOT NULL DEFAULT 'initial_defect',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_attachments_report_id` (`report_id`),
    KEY `idx_attachments_uploaded_by` (`uploaded_by`),
    CONSTRAINT `fk_attachments_report` FOREIGN KEY (`report_id`) REFERENCES `reports` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_attachments_uploader` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table: report_assignments
-- Work order assignments to technicians/maintenance staff
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `report_assignments`;
CREATE TABLE `report_assignments` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `report_id` INT UNSIGNED NOT NULL,
    `assigned_to` INT UNSIGNED NOT NULL COMMENT 'Technician/Worker',
    `assigned_by` INT UNSIGNED NOT NULL COMMENT 'Supervisor or Admin',
    `assigned_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `target_completion_date` DATE NULL,
    `assignment_notes` TEXT NULL,
    `status` ENUM('pending', 'accepted', 'in_progress', 'completed') NOT NULL DEFAULT 'pending',
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_assignments_report_id` (`report_id`),
    KEY `idx_assignments_assigned_to` (`assigned_to`),
    KEY `idx_assignments_assigned_by` (`assigned_by`),
    CONSTRAINT `fk_assignments_report` FOREIGN KEY (`report_id`) REFERENCES `reports` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_assignments_worker` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
    CONSTRAINT `fk_assignments_supervisor` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table: report_status_history
-- Audit log of status transitions and comments
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `report_status_history`;
CREATE TABLE `report_status_history` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `report_id` INT UNSIGNED NOT NULL,
    `changed_by` INT UNSIGNED NOT NULL,
    `previous_status` VARCHAR(30) NULL,
    `new_status` VARCHAR(30) NOT NULL,
    `remarks` TEXT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_status_history_report_id` (`report_id`),
    KEY `idx_status_history_changed_by` (`changed_by`),
    CONSTRAINT `fk_history_report` FOREIGN KEY (`report_id`) REFERENCES `reports` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_history_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table: repair_completions
-- Completion documentation, parts replaced, and verification
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `repair_completions`;
CREATE TABLE `repair_completions` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `report_id` INT UNSIGNED NOT NULL,
    `completed_by` INT UNSIGNED NOT NULL COMMENT 'Technician who resolved the defect',
    `completed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `action_taken` TEXT NOT NULL,
    `parts_replaced` TEXT NULL,
    `repair_cost` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `supervisor_verified_by` INT UNSIGNED NULL,
    `supervisor_verified_at` TIMESTAMP NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_completions_report_id` (`report_id`),
    KEY `idx_completions_completed_by` (`completed_by`),
    KEY `idx_completions_verified_by` (`supervisor_verified_by`),
    CONSTRAINT `fk_completions_report` FOREIGN KEY (`report_id`) REFERENCES `reports` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_completions_technician` FOREIGN KEY (`completed_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
    CONSTRAINT `fk_completions_supervisor` FOREIGN KEY (`supervisor_verified_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table: report_feedback
-- Reporter feedback & satisfaction ratings upon issue resolution
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `report_feedback`;
CREATE TABLE `report_feedback` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `report_id` INT UNSIGNED NOT NULL,
    `user_id` INT UNSIGNED NOT NULL,
    `rating` TINYINT UNSIGNED NOT NULL COMMENT '1 to 5 stars',
    `comments` TEXT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_feedback_report_id` (`report_id`),
    KEY `idx_feedback_user_id` (`user_id`),
    CONSTRAINT `fk_feedback_report` FOREIGN KEY (`report_id`) REFERENCES `reports` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_feedback_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table: notifications
-- In-app notifications for ticket updates and assignments
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT UNSIGNED NOT NULL,
    `report_id` INT UNSIGNED NULL,
    `title` VARCHAR(150) NOT NULL,
    `message` TEXT NOT NULL,
    `is_read` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_notifications_user_id` (`user_id`),
    KEY `idx_notifications_report_id` (`report_id`),
    CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_notifications_report` FOREIGN KEY (`report_id`) REFERENCES `reports` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET foreign_key_checks = 1;
