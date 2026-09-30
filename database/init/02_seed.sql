-- ==============================================================================
-- FixMyCampus: Facility Defect and Maintenance Reporting System
-- Seed Data (Roles, Users, Categories, Buildings, Floors, Locations, Reports)
-- ==============================================================================

SET NAMES utf8mb4;
SET foreign_key_checks = 0;

-- -----------------------------------------------------------------------------
-- Seed: roles
-- -----------------------------------------------------------------------------
INSERT INTO `roles` (`id`, `name`, `display_name`, `description`) VALUES
(1, 'admin', 'Administrator', 'Full system management, user administration, and system configuration'),
(2, 'supervisor', 'Maintenance Staff', 'Oversees maintenance operations, dispatches work orders, and verifies repairs'),
(3, 'technician', 'Maintenance Technician', 'Facility maintenance personnel who inspects, repairs, and uploads completion proof'),
(4, 'faculty', 'Faculty Member', 'Academic and instructional staff reporting facility and classroom issues'),
(5, 'student', 'Student', 'Enrolled campus student submitting and tracking defect reports')
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);

-- -----------------------------------------------------------------------------
-- Seed: users
-- 1. System Administrator (admin@phinmaed.com / Admin@1234)
-- 2. Mark Dyvie Cerna (Student, CITE)
-- (Maintenance staff accounts will be registered via the Admin page)
-- -----------------------------------------------------------------------------
INSERT INTO `users` (`id`, `role_id`, `user_identifier`, `full_name`, `email`, `password_hash`, `phone_number`, `department`, `status`) VALUES
(1, 1, 'ADM-001', 'Campus Administrator', 'admin@phinmaed.com', '$2y$10$pj8PZHjsujG2W2bOmTQYyetGak6xr/.YGgf2oA22ObvWAd9Sy.uPu', '+1-555-0100', 'Facilities & Administration', 'active'),
(11, 5, '03-01-2526-045589', 'Mark Dyvie Cerna', 'mafe.cerna.up@phinmaed.com', '$2y$10$HulORYDbVIJ5wuRet5/r4O9Uo1RMt72/72Cvz22U.VlBghlTuxwRC', NULL, 'CITE - College of Information Technology Education', 'active')
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`), `department` = VALUES(`department`), `password_hash` = VALUES(`password_hash`);

-- -----------------------------------------------------------------------------
-- Seed: categories (Aligned with Figma 9 Defect Categories)
-- -----------------------------------------------------------------------------
INSERT INTO `categories` (`id`, `name`, `slug`, `description`, `icon`, `sla_hours`, `is_active`) VALUES
(1, 'Air Conditioning', 'air-conditioning', 'AC units, cooling failure, leaking water, thermostat issues', 'snowflake', 24, 1),
(2, 'Electrical', 'electrical', 'Lighting, wiring, sockets, power outages, switches', 'zap', 24, 1),
(3, 'Furniture', 'furniture', 'Chairs, desks, armchairs, tables, fixtures', 'armchair', 48, 1),
(4, 'Classroom', 'classroom', 'Projectors, whiteboards, podiums, speakers, classroom equipment', 'presentation', 24, 1),
(5, 'Restroom', 'restroom', 'Toilets, urinals, sinks, plumbing, leaks', 'droplet', 12, 1),
(6, 'Internet', 'internet', 'Wi-Fi, Ethernet, network ports, connectivity', 'wifi', 24, 1),
(7, 'Cleaning', 'cleaning', 'Trash, spills, sanitation, floor maintenance', 'trash-2', 12, 1),
(8, 'Safety', 'safety', 'Handrails, stairs, slippery surfaces, hazards', 'shield', 6, 1),
(9, 'Other', 'other', 'General facility or unclassified defects', 'more-horizontal', 48, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- -----------------------------------------------------------------------------
-- Seed: buildings (Updated Campus Facilities)
-- -----------------------------------------------------------------------------
INSERT INTO `buildings` (`id`, `code`, `name`, `is_active`) VALUES
(1, 'PTC', 'PTC Building', 1),
(2, 'CMA', 'CMA Building', 1),
(3, 'NH',  'NH Building', 1),
(4, 'MBA', 'MBA Building', 1),
(5, 'RS',  'RS Building', 1),
(6, 'BE',  'BE Building', 1),
(7, 'CCJE', 'CCJE Building', 1),
(8, 'LIB', 'Library', 1),
(9, 'GYM', 'GYM', 1),
(10, 'OTHERS', 'Others', 1),
(11, 'SP', 'SP (Student Plaza)', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- -----------------------------------------------------------------------------
-- Seed: floors (Floors per Building)
-- -----------------------------------------------------------------------------
INSERT INTO `floors` (`id`, `building_id`, `floor_number`, `floor_name`) VALUES
-- PTC Building - 4 floors
(1, 1, 1, '1st Floor'),
(2, 1, 2, '2nd Floor'),
(3, 1, 3, '3rd Floor'),
(4, 1, 4, '4th Floor'),

-- CMA Building - 4 floors
(5, 2, 1, '1st Floor'),
(6, 2, 2, '2nd Floor'),
(7, 2, 3, '3rd Floor'),
(8, 2, 4, '4th Floor'),

-- NH Building - 5 floors
(9, 3, 1, '1st Floor'),
(10, 3, 2, '2nd Floor'),
(11, 3, 3, '3rd Floor'),
(12, 3, 4, '4th Floor'),
(13, 3, 5, '5th Floor'),

-- MBA Building - 5 floors
(14, 4, 1, '1st Floor'),
(15, 4, 2, '2nd Floor'),
(16, 4, 3, '3rd Floor'),
(17, 4, 4, '4th Floor'),
(18, 4, 5, '5th Floor'),

-- RS Building - 8 floors
(19, 5, 1, '1st Floor'),
(20, 5, 2, '2nd Floor'),
(21, 5, 3, '3rd Floor'),
(22, 5, 4, '4th Floor'),
(23, 5, 5, '5th Floor'),
(24, 5, 6, '6th Floor'),
(25, 5, 7, '7th Floor'),
(26, 5, 8, '8th Floor'),

-- BE Building - 4 floors
(27, 6, 1, '1st Floor'),
(28, 6, 2, '2nd Floor'),
(29, 6, 3, '3rd Floor'),
(30, 6, 4, '4th Floor'),

-- CCJE Building - 4 floors
(31, 7, 1, '1st Floor'),
(32, 7, 2, '2nd Floor'),
(33, 7, 3, '3rd Floor'),
(34, 7, 4, '4th Floor'),

-- Library - 2 floors
(35, 8, 1, '1st Floor'),
(36, 8, 2, '2nd Floor'),

-- GYM - 1 floor
(37, 9, 1, '1st Floor'),

-- SP (Student Plaza) - 1 floor
(38, 11, 1, '1st Floor')
ON DUPLICATE KEY UPDATE `floor_name` = VALUES(`floor_name`);

-- Note: All sample defect reports and mock data have been reset to 0 until actual reports are filed.

SET foreign_key_checks = 1;
