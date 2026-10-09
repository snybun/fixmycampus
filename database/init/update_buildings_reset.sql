SET FOREIGN_KEY_CHECKS = 0;

-- 1. Wipe sample reports and dependent tables
TRUNCATE TABLE `report_attachments`;
TRUNCATE TABLE `report_assignments`;
TRUNCATE TABLE `report_status_history`;
TRUNCATE TABLE `repair_completions`;
TRUNCATE TABLE `report_feedback`;
TRUNCATE TABLE `notifications`;
TRUNCATE TABLE `reports`;

-- 2. Clear old locations and floors
TRUNCATE TABLE `locations`;
TRUNCATE TABLE `floors`;

-- 3. Description is not in schema, skip drop

-- 4. Clear and repopulate buildings
TRUNCATE TABLE `buildings`;

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
(10, 'OTHERS', 'Others', 1);

-- 5. Populate floors for each building according to user spec
-- PTC Building - 4 floors
INSERT INTO `floors` (`building_id`, `floor_number`, `floor_name`) VALUES
(1, 1, '1st Floor'),
(1, 2, '2nd Floor'),
(1, 3, '3rd Floor'),
(1, 4, '4th Floor'),

-- CMA Building - 4 floors
(2, 1, '1st Floor'),
(2, 2, '2nd Floor'),
(2, 3, '3rd Floor'),
(2, 4, '4th Floor'),

-- NH Building - 5 floors
(3, 1, '1st Floor'),
(3, 2, '2nd Floor'),
(3, 3, '3rd Floor'),
(3, 4, '4th Floor'),
(3, 5, '5th Floor'),

-- MBA Building - 5 floors
(4, 1, '1st Floor'),
(4, 2, '2nd Floor'),
(4, 3, '3rd Floor'),
(4, 4, '4th Floor'),
(4, 5, '5th Floor'),

-- RS Building - 8 floors
(5, 1, '1st Floor'),
(5, 2, '2nd Floor'),
(5, 3, '3rd Floor'),
(5, 4, '4th Floor'),
(5, 5, '5th Floor'),
(5, 6, '6th Floor'),
(5, 7, '7th Floor'),
(5, 8, '8th Floor'),

-- BE Building - 4 floors
(6, 1, '1st Floor'),
(6, 2, '2nd Floor'),
(6, 3, '3rd Floor'),
(6, 4, '4th Floor'),

-- CCJE Building - 4 floors
(7, 1, '1st Floor'),
(7, 2, '2nd Floor'),
(7, 3, '3rd Floor'),
(7, 4, '4th Floor'),

-- Library - 2 floors
(8, 1, '1st Floor'),
(8, 2, '2nd Floor'),

-- GYM - 1 floor
(9, 1, '1st Floor');

-- 6. Update categories to match Figma 9 categories
TRUNCATE TABLE `categories`;
INSERT INTO `categories` (`id`, `name`, `slug`, `description`, `icon`, `sla_hours`, `is_active`) VALUES
(1, 'Air Conditioning', 'air-conditioning', 'AC units, cooling failure, leaking water, thermostat issues', 'snowflake', 24, 1),
(2, 'Electrical', 'electrical', 'Lighting, wiring, sockets, power outages, switches', 'zap', 24, 1),
(3, 'Furniture', 'furniture', 'Chairs, desks, armchairs, tables, fixtures', 'armchair', 48, 1),
(4, 'Classroom', 'classroom', 'Projectors, whiteboards, podiums, speakers, classroom equipment', 'presentation', 24, 1),
(5, 'Restroom', 'restroom', 'Toilets, urinals, sinks, plumbing, leaks', 'droplet', 12, 1),
(6, 'Internet', 'internet', 'Wi-Fi, Ethernet, network ports, connectivity', 'wifi', 24, 1),
(7, 'Cleaning', 'cleaning', 'Trash, spills, sanitation, floor maintenance', 'trash-2', 12, 1),
(8, 'Safety', 'safety', 'Handrails, stairs, slippery surfaces, hazards', 'shield', 6, 1),
(9, 'Other', 'other', 'General facility or unclassified defects', 'more-horizontal', 48, 1);

SET FOREIGN_KEY_CHECKS = 1;
