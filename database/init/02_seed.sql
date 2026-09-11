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
(2, 'supervisor', 'Maintenance Supervisor', 'Oversees maintenance operations, dispatches work orders, and verifies repairs'),
(3, 'technician', 'Maintenance Technician', 'Facility maintenance personnel who inspects, repairs, and uploads completion proof'),
(4, 'faculty', 'Faculty Member', 'Academic and instructional staff reporting facility and classroom issues'),
(5, 'student', 'Student', 'Enrolled campus student submitting and tracking defect reports')
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);

-- -----------------------------------------------------------------------------
-- Seed: users
-- Passwords:
-- Admin:        admin@fixmycampus.edu       / Admin@1234
-- Supervisor:   supervisor@fixmycampus.edu  / Supervisor@1234
-- Technician 1: worker.john@fixmycampus.edu / Worker@1234
-- Technician 2: worker.carlos@fixmycampus.edu/ Worker@1234
-- Faculty:      prof.smith@fixmycampus.edu  / Faculty@1234
-- Student 1:    student.alex@fixmycampus.edu/ Student@1234
-- Student 2:    student.emily@fixmycampus.edu/ Student@1234
-- -----------------------------------------------------------------------------
INSERT INTO `users` (`id`, `role_id`, `user_identifier`, `full_name`, `email`, `password_hash`, `phone_number`, `department`, `status`) VALUES
(1, 1, 'ADM-001', 'System Administrator', 'admin@fixmycampus.edu', '$2b$10$Yp4C56roPWXZR1i7HrOPiOynb.juQw7/djpV6XrlOHzUGZuW0xWuG', '+1-555-0100', 'IT & Physical Plant', 'active'),
(2, 2, 'MGT-001', 'Robert Vance', 'supervisor@fixmycampus.edu', '$2b$10$vBvtFsuY97qVoir6weJc6eZOxNz67Lk/7J1KtxRZavSk0DwjiqL/S', '+1-555-0101', 'Facilities Management', 'active'),
(3, 3, 'TEC-001', 'John Miller', 'worker.john@fixmycampus.edu', '$2b$10$5zxljZD0GBS/wFVSyovKeOVYqx3UtC4MuUDFCDknDiKVPHPRMH0py', '+1-555-0102', 'HVAC & Electrical Maintenance', 'active'),
(4, 3, 'TEC-002', 'Carlos Ramos', 'worker.carlos@fixmycampus.edu', '$2b$10$5zxljZD0GBS/wFVSyovKeOVYqx3UtC4MuUDFCDknDiKVPHPRMH0py', '+1-555-0103', 'Carpentry & General Repairs', 'active'),
(5, 4, 'FAC-101', 'Dr. Sarah Smith', 'prof.smith@fixmycampus.edu', '$2b$10$aDmuUIl5mLdIrh7cfrQhrefC7TVv1wuG.IVNH9HUod3Bk2GXI5iEm', '+1-555-0104', 'Computer Science & Engineering', 'active'),
(6, 5, 'STU-202401', 'Alex Johnson', 'student.alex@fixmycampus.edu', '$2b$10$BtifN8uWvjQAai5p9PLHJe3iOzRJMAPAx2xH8pu7e/SVTCqAfEVlS', '+1-555-0105', 'Civil Engineering', 'active'),
(7, 5, 'STU-202402', 'Emily Chen', 'student.emily@fixmycampus.edu', '$2b$10$BtifN8uWvjQAai5p9PLHJe3iOzRJMAPAx2xH8pu7e/SVTCqAfEVlS', '+1-555-0106', 'Information Technology', 'active')
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`);

-- -----------------------------------------------------------------------------
-- Seed: categories
-- Comprehensive categories matching campus facility defect reporting requirements
-- -----------------------------------------------------------------------------
INSERT INTO `categories` (`id`, `name`, `slug`, `description`, `icon`, `sla_hours`, `is_active`) VALUES
(1,  'Broken Chairs & Furniture',       'broken-chairs-furniture',     'Damaged student desks, teacher tables, lecture armchairs, broken benches, or office furniture', 'bi-chair', 48, 1),
(2,  'Air Conditioning & HVAC',         'air-conditioning-hvac',       'Malfunctioning AC units, weak cooling, leaking water, thermostat failure, or bad ventilation',   'bi-snow', 24, 1),
(3,  'Lighting & Electrical',           'lighting-electrical',         'Flickering or dead fluorescent tubes, burnt bulbs, exposed wiring, loose switches, or sockets', 'bi-lightbulb', 24, 1),
(4,  'Whiteboards & Display Boards',    'whiteboards-display-boards',  'Damaged writing surfaces, peeling frames, missing eraser trays, or stained projection boards', 'bi-easel', 72, 1),
(5,  'Classroom AV & Equipment',        'classroom-av-equipment',      'Broken projectors, malfunctioning audio speakers, missing HDMI cables, or podium PC issues',   'bi-display', 24, 1),
(6,  'Restroom & Plumbing',             'restroom-plumbing',           'Clogged toilets, non-flushing urinals, leaking pipes, faucet breakdowns, or low water pressure', 'bi-droplet', 12, 1),
(7,  'Internet & Network Issues',       'internet-network-issues',     'Weak Wi-Fi signal, dead Ethernet ports, damaged router access points, or connectivity drops',   'bi-wifi', 24, 1),
(8,  'Cleaning & Janitorial',           'cleaning-janitorial',         'Overflowing trash cans, floor spills, pest sightings, foul odors, or unsanitary conditions',     'bi-trash', 12, 1),
(9,  'Safety & Hazard Concerns',        'safety-hazards',              'Slippery stairs, loose handrails, broken window glass, blocked fire exits, or tripping hazards', 'bi-exclamation-triangle', 6, 1),
(10, 'Campus Grounds & Landscaping',    'campus-grounds-landscaping',  'Overgrown vegetation, broken pathway tiles, damaged outdoor lighting, or fallen tree branches', 'bi-tree', 72, 1),
(11, 'Other Maintenance Issues',        'other-maintenance-issues',    'Other physical plant, structural, architectural, or unclassified campus facility defects',     'bi-tools', 48, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- -----------------------------------------------------------------------------
-- Seed: buildings
-- -----------------------------------------------------------------------------
INSERT INTO `buildings` (`id`, `code`, `name`, `description`, `is_active`) VALUES
(1, 'ENG-BLDG', 'Engineering & Technology Complex', 'Main complex for College of Engineering, computer labs, and engineering lecture halls', 1),
(2, 'SCI-HALL', 'Science & Innovation Hall', 'Laboratories and lecture rooms for Physics, Chemistry, and Biological Sciences', 1),
(3, 'ADM-CTR',  'Central Administration Building', 'Offices of the University President, Registrar, Dean of Students, and Facilities', 1),
(4, 'LIB-MAIN', 'University Memorial Library', 'Multi-level campus library, study rooms, digital resource hubs, and archives', 1),
(5, 'SPT-CMP',  'Sports Complex & Gymnasium', 'Indoor courts, fitness centers, athletic facilities, and spectator bleachers', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- -----------------------------------------------------------------------------
-- Seed: floors
-- -----------------------------------------------------------------------------
INSERT INTO `floors` (`id`, `building_id`, `floor_number`, `floor_name`) VALUES
(1, 1, 0, 'Ground Floor'),
(2, 1, 1, '1st Floor'),
(3, 1, 2, '2nd Floor'),
(4, 1, 3, '3rd Floor'),
(5, 2, 0, 'Ground Floor'),
(6, 2, 1, '1st Floor'),
(7, 2, 2, '2nd Floor'),
(8, 3, 0, 'Ground Floor'),
(9, 3, 1, '1st Floor'),
(10, 4, 0, 'Ground Floor'),
(11, 4, 1, '1st Floor'),
(12, 4, 2, '2nd Floor'),
(13, 5, 0, 'Ground Level')
ON DUPLICATE KEY UPDATE `floor_name` = VALUES(`floor_name`);

-- -----------------------------------------------------------------------------
-- Seed: locations
-- -----------------------------------------------------------------------------
INSERT INTO `locations` (`id`, `building_id`, `floor_id`, `room_number`, `name`, `type`, `is_active`) VALUES
-- Engineering Building
(1,  1, 1, 'ENG-G01', 'Engineering Student Commons', 'other', 1),
(2,  1, 1, 'REST-ENG-G', 'Ground Floor Men & Women Restrooms', 'restroom', 1),
(3,  1, 2, 'ENG-101', 'Engineering Lecture Hall 101', 'classroom', 1),
(4,  1, 2, 'ENG-102', 'Engineering Design Studio 102', 'classroom', 1),
(5,  1, 3, 'ENG-204', 'Computer Science Lab 4', 'laboratory', 1),
(6,  1, 3, 'ENG-208', 'Robotics & Mechatronics Lab', 'laboratory', 1),
(7,  1, 4, 'ENG-301', 'Faculty Department Office', 'office', 1),

-- Science Hall
(8,  2, 5, 'SCI-G05', 'General Physics Laboratory', 'laboratory', 1),
(9,  2, 6, 'SCI-102', 'Organic Chemistry Lab', 'laboratory', 1),
(10, 2, 7, 'SCI-201', 'Biology Amphitheater', 'auditorium', 1),
(11, 2, 7, 'REST-SCI-2', '2nd Floor North Restroom', 'restroom', 1),

-- Administration Building
(12, 3, 8, 'ADM-G01', 'Registrar Public Service Counter', 'office', 1),
(13, 3, 9, 'ADM-105', 'Facilities & Maintenance HQ', 'office', 1),

-- Library
(14, 4, 10, 'LIB-G01', 'Main Circulation & Information Desk', 'other', 1),
(15, 4, 11, 'LIB-104', 'Quiet Study Hall East', 'classroom', 1),
(16, 4, 12, 'LIB-202', 'Digital Media Center', 'laboratory', 1),

-- Campus Grounds & Sports
(17, 5, 13, 'GYM-MAIN', 'Indoor Basketball Arena', 'grounds', 1),
(18, 1, NULL, 'OUT-ENG-COURT', 'Engineering North Courtyard & Benches', 'grounds', 1),
(19, 2, NULL, 'OUT-SCI-WALK', 'Science Promenade Pathway', 'grounds', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- -----------------------------------------------------------------------------
-- Seed: reports
-- Sample defect reports across various stages and categories
-- -----------------------------------------------------------------------------
INSERT INTO `reports` (`id`, `ticket_number`, `reporter_id`, `category_id`, `location_id`, `specific_area`, `title`, `description`, `priority`, `status`, `reported_at`) VALUES
(1, 'FMC-202609-0001', 5, 2, 5, 'Rear corner near server rack', 'Air Conditioner blowing warm air and leaking water', 'The split AC unit on the rear wall of Computer Lab 4 has stopped cooling properly and is continuously dripping water onto the floor tiles, causing a slip hazard.', 'high', 'in_progress', '2026-09-08 09:15:00'),
(2, 'FMC-202609-0002', 6, 1, 3, 'Row 4, seat number 18', 'Broken tablet armrest on lecture seat', 'The wooden tablet arm on seat 18 is cracked in half and has exposed sharp splinters. Cannot write or place a laptop on it.', 'medium', 'assigned', '2026-09-09 11:30:00'),
(3, 'FMC-202609-0003', 7, 6, 11, 'Middle wash basin faucet', 'Constantly dripping water faucet in 2nd floor restroom', 'The faucet handle does not shut off completely, wasting water all day and overflowing if the drain gets sluggish.', 'medium', 'resolved', '2026-09-07 14:00:00'),
(4, 'FMC-202609-0004', 5, 3, 8, 'Overhead lighting row 2', 'Flickering fluorescent light fixtures', 'Two tube lights in Physics Lab are rapidly strobing and producing a buzzing sound, making it difficult for students to concentrate during experiments.', 'low', 'under_review', '2026-09-10 08:45:00'),
(5, 'FMC-202609-0005', 6, 9, 19, 'Flight between Ground and 1st floor', 'Loose metal handrail on exterior staircase', 'The central support anchor of the stainless steel handrail has rusted through and detached from the concrete step. Major falling hazard.', 'emergency', 'submitted', '2026-09-11 07:30:00'),
(6, 'FMC-202609-0006', 5, 5, 4, 'Instructor lectern podium', 'Ceiling projector HDMI input signal keeps dropping', 'The HDMI wall plate connection to the ceiling projector disconnects every few minutes whenever the instructor moves near the lectern.', 'medium', 'submitted', '2026-09-11 10:20:00')
ON DUPLICATE KEY UPDATE `ticket_number` = VALUES(`ticket_number`);

-- -----------------------------------------------------------------------------
-- Seed: report_attachments
-- -----------------------------------------------------------------------------
INSERT INTO `report_attachments` (`id`, `report_id`, `uploaded_by`, `file_path`, `file_name`, `file_type`, `file_size`, `attachment_stage`, `created_at`) VALUES
(1, 1, 5, '/uploads/reports/fmc_0001_initial_ac_leak.jpg', 'ac_leak_photo.jpg', 'image/jpeg', 1420500, 'initial_defect', '2026-09-08 09:15:30'),
(2, 2, 6, '/uploads/reports/fmc_0002_broken_armrest.jpg', 'broken_armrest.jpg', 'image/jpeg', 985200, 'initial_defect', '2026-09-09 11:31:10'),
(3, 3, 7, '/uploads/reports/fmc_0003_faucet_leak.jpg', 'faucet_leak.jpg', 'image/jpeg', 1120000, 'initial_defect', '2026-09-07 14:01:00'),
(4, 3, 3, '/uploads/reports/fmc_0003_completion_proof.jpg', 'faucet_repaired_proof.jpg', 'image/jpeg', 1230400, 'completion_proof', '2026-09-08 15:45:00')
ON DUPLICATE KEY UPDATE `file_path` = VALUES(`file_path`);

-- -----------------------------------------------------------------------------
-- Seed: report_assignments
-- -----------------------------------------------------------------------------
INSERT INTO `report_assignments` (`id`, `report_id`, `assigned_to`, `assigned_by`, `assigned_at`, `target_completion_date`, `assignment_notes`, `status`) VALUES
(1, 1, 3, 2, '2026-09-08 10:00:00', '2026-09-09', 'Inspect refrigerant lines, drain pipe blockage, and evaporator coils.', 'in_progress'),
(2, 2, 4, 2, '2026-09-09 13:00:00', '2026-09-11', 'Replace tablet armrest assembly with spare unit from warehouse shelf C-4.', 'accepted'),
(3, 3, 3, 2, '2026-09-07 15:00:00', '2026-09-08', 'Replace washer cartridge or replace faucet fixture if cracked.', 'completed')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- -----------------------------------------------------------------------------
-- Seed: report_status_history
-- -----------------------------------------------------------------------------
INSERT INTO `report_status_history` (`id`, `report_id`, `changed_by`, `previous_status`, `new_status`, `remarks`, `created_at`) VALUES
(1, 1, 5, NULL, 'submitted', 'Defect report submitted by Dr. Sarah Smith', '2026-09-08 09:15:00'),
(2, 1, 2, 'submitted', 'under_review', 'Reviewed by Maintenance Supervisor Robert Vance', '2026-09-08 09:40:00'),
(3, 1, 2, 'under_review', 'assigned', 'Assigned to Technician John Miller', '2026-09-08 10:00:00'),
(4, 1, 3, 'assigned', 'in_progress', 'Technician on-site inspecting AC condensation line and coil filter', '2026-09-08 11:10:00'),

(5, 2, 6, NULL, 'submitted', 'Defect report submitted by Alex Johnson', '2026-09-09 11:30:00'),
(6, 2, 2, 'submitted', 'assigned', 'Assigned to Technician Carlos Ramos for carpentry repair', '2026-09-09 13:00:00'),

(7, 3, 7, NULL, 'submitted', 'Defect report submitted by Emily Chen', '2026-09-07 14:00:00'),
(8, 3, 2, 'submitted', 'assigned', 'Assigned to Technician John Miller', '2026-09-07 15:00:00'),
(9, 3, 3, 'assigned', 'in_progress', 'Water supply shut off to replace cartridge', '2026-09-08 14:30:00'),
(10, 3, 3, 'in_progress', 'resolved', 'Ceramic faucet cartridge replaced and leak tested. Work completed.', '2026-09-08 15:50:00'),

(11, 4, 5, NULL, 'submitted', 'Defect report submitted by Dr. Sarah Smith', '2026-09-10 08:45:00'),
(12, 4, 2, 'submitted', 'under_review', 'Supervisor inspecting whether ballast or tube replacement is required', '2026-09-10 10:00:00'),

(13, 5, 6, NULL, 'submitted', 'Defect report submitted by Alex Johnson', '2026-09-11 07:30:00'),
(14, 6, 5, NULL, 'submitted', 'Defect report submitted by Dr. Sarah Smith', '2026-09-11 10:20:00')
ON DUPLICATE KEY UPDATE `new_status` = VALUES(`new_status`);

-- -----------------------------------------------------------------------------
-- Seed: repair_completions
-- Completion record for resolved report #3
-- -----------------------------------------------------------------------------
INSERT INTO `repair_completions` (`id`, `report_id`, `completed_by`, `completed_at`, `action_taken`, `parts_replaced`, `repair_cost`, `supervisor_verified_by`, `supervisor_verified_at`) VALUES
(1, 3, 3, '2026-09-08 15:50:00', 'Disassembled faucet valve assembly. Discovered worn internal rubber O-ring and scored ceramic disc cartridge. Replaced with new standard 35mm ceramic valve cartridge and tested under full water pressure with no leaks.', '1x 35mm Ceramic Disc Cartridge (Stock #PLB-35C), 2x Rubber Washers', 18.50, 2, '2026-09-08 16:30:00')
ON DUPLICATE KEY UPDATE `action_taken` = VALUES(`action_taken`);

-- -----------------------------------------------------------------------------
-- Seed: report_feedback
-- -----------------------------------------------------------------------------
INSERT INTO `report_feedback` (`id`, `report_id`, `user_id`, `rating`, `comments`, `created_at`) VALUES
(1, 3, 7, 5, 'Thank you for the quick repair! The sink no longer drips and the restroom counter is clean.', '2026-09-08 17:15:00')
ON DUPLICATE KEY UPDATE `rating` = VALUES(`rating`);

-- -----------------------------------------------------------------------------
-- Seed: notifications
-- -----------------------------------------------------------------------------
INSERT INTO `notifications` (`id`, `user_id`, `report_id`, `title`, `message`, `is_read`, `created_at`) VALUES
(1, 5, 1, 'Ticket In Progress: FMC-202609-0001', 'Technician John Miller has commenced repair work on your reported AC defect in Computer Lab 4.', 1, '2026-09-08 11:10:00'),
(2, 6, 2, 'Ticket Assigned: FMC-202609-0002', 'Your report regarding the broken tablet armrest has been assigned to Technician Carlos Ramos.', 0, '2026-09-09 13:00:00'),
(3, 7, 3, 'Ticket Resolved: FMC-202609-0003', 'Maintenance repair has been completed on the 2nd floor restroom faucet. Please leave your feedback.', 1, '2026-09-08 15:50:00'),
(4, 2, 5, 'EMERGENCY Defect Reported: FMC-202609-0005', 'A high-priority emergency ticket regarding loose staircase handrail has been submitted.', 0, '2026-09-11 07:30:00')
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

SET foreign_key_checks = 1;
