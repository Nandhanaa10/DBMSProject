-- OpportunityHub + SkillPath :: seed.sql  (run AFTER schema.sql and features.sql)
-- The trigger trg_applications_after_insert writes the first history row of every application below.
-- Student password_hash is a placeholder; run backend/scripts/set_demo_passwords.py to set the demo password.
USE opportunityhub;

INSERT INTO Students (name, email, password_hash, college, branch, year, cgpa) VALUES
('Aarav Sharma',  'aarav@example.edu',  'SEED_PLACEHOLDER', 'Anna University',     'CSE',  3, 8.45),
('Diya Nair',     'diya@example.edu',   'SEED_PLACEHOLDER', 'VIT Vellore',         'IT',   3, 8.90),
('Rohan Iyer',    'rohan@example.edu',  'SEED_PLACEHOLDER', 'NIT Trichy',          'ECE',  4, 7.60),
('Meera Krishnan','meera@example.edu',  'SEED_PLACEHOLDER', 'PSG College of Technology', 'CSE', 2, 9.10),
('Karthik Raj',   'karthik@example.edu','SEED_PLACEHOLDER', 'SRM Institute of Science and Technology', 'MECH', 3, 7.20),
('Sneha Patel',   'sneha@example.edu',  'SEED_PLACEHOLDER', 'Anna University',     'IT',   4, 8.10);

INSERT INTO Organizations (name, type, website, location) VALUES
('NimbusSoft Technologies', 'company',      'https://nimbussoft.example.com',  'Bengaluru'),
('DataForge Analytics',     'company',      'https://dataforge.example.com',   'Chennai'),
('GreenGrid Energy',        'company',      'https://greengrid.example.com',   'Hyderabad'),
('PixelCraft Studios',      'startup',      'https://pixelcraft.example.com',  'Pune'),
('CloudNest Systems',       'company',      'https://cloudnest.example.com',   'Chennai'),
('Chennai AI Research Lab', 'research_lab', 'https://airesearch.example.edu',  'Chennai'),
('CodeSprint Foundation',   'community',    'https://codesprint.example.org',  'Chennai'),
('FinEdge Payments',        'startup',      'https://finedge.example.com',     'Mumbai'),
('RoboVision Labs',         'research_lab', 'https://robovision.example.com',  'Bengaluru'),
('OpenCampus Collective',   'community',    'https://opencampus.example.org',  'Remote');

INSERT INTO Skills (skill_name, category) VALUES
('Python','Programming'),('Java','Programming'),('C++','Programming'),('JavaScript','Programming'),
('TypeScript','Programming'),('React','Web'),('Node.js','Web'),('Flask','Web'),('Django','Web'),
('HTML/CSS','Web'),('SQL','Database'),('MySQL','Database'),('MongoDB','Database'),('Git','DevOps'),
('Docker','DevOps'),('Kubernetes','DevOps'),('AWS','Cloud'),('Linux','DevOps'),
('Data Structures','Core CS'),('Algorithms','Core CS'),('Machine Learning','Data & AI'),
('Deep Learning','Data & AI'),('TensorFlow','Data & AI'),('Pandas','Data & AI'),('Statistics','Data & AI'),
('Figma','Design'),('Communication','Soft Skills'),('Problem Solving','Soft Skills'),
('Embedded C','Hardware'),('Cybersecurity','Security');

-- 40 opportunities: ids 1-14 internship, 15-22 hackathon, 23-32 job, 33-40 research
INSERT INTO Opportunities (organization_id, title, type, description, location, mode, stipend, deadline, apply_link) VALUES
(1,'Backend Engineering Intern','internship','Build REST services and tune SQL queries on a production platform.','Bengaluru','hybrid',25000,'2026-11-15 23:59:00','https://apply.example.com/o/1'),
(1,'Frontend Developer Intern','internship','Ship accessible React interfaces for a SaaS dashboard.','Remote (India)','remote',22000,'2026-11-20 23:59:00','https://apply.example.com/o/2'),
(2,'Data Analyst Intern','internship','Clean data and build weekly KPI reports for retail clients.','Chennai','hybrid',20000,'2026-11-10 23:59:00','https://apply.example.com/o/3'),
(2,'Machine Learning Intern','internship','Train and evaluate demand-forecasting models.','Chennai','onsite',30000,'2026-12-05 23:59:00','https://apply.example.com/o/4'),
(3,'Embedded Systems Intern','internship','Firmware for smart energy meters in C.','Hyderabad','onsite',18000,'2026-11-25 23:59:00','https://apply.example.com/o/5'),
(4,'UI/UX Design Intern','internship','Design mobile game onboarding flows in Figma.','Remote (India)','remote',15000,'2026-11-30 23:59:00','https://apply.example.com/o/6'),
(5,'DevOps Intern','internship','Containerise services and maintain CI pipelines.','Chennai','hybrid',24000,'2026-12-10 23:59:00','https://apply.example.com/o/7'),
(5,'Cloud Support Intern','internship','Triage customer tickets on cloud infrastructure.','Chennai','onsite',20000,'2026-12-20 23:59:00','https://apply.example.com/o/8'),
(8,'Full Stack Intern','internship','Work on payment dashboards with React and Node.js.','Mumbai','hybrid',28000,'2026-11-18 23:59:00','https://apply.example.com/o/9'),
(8,'Security Analyst Intern','internship','Assist with vulnerability assessment of payment APIs.','Mumbai','onsite',26000,'2026-12-15 23:59:00','https://apply.example.com/o/10'),
(1,'Python Developer Intern','internship','Develop internal tools with Django and SQL.','Remote (India)','remote',21000,'2027-01-10 23:59:00','https://apply.example.com/o/11'),
(2,'Business Analytics Intern','internship','Statistical analysis and storytelling for client decks.','Remote (India)','remote',17000,'2027-01-15 23:59:00','https://apply.example.com/o/12'),
(4,'Web Developer Intern','internship','Build marketing sites with HTML, CSS and JavaScript.','Remote (India)','remote',16000,'2026-10-30 23:59:00','https://apply.example.com/o/13'),
(3,'Data Engineering Intern','internship','Build ETL jobs for smart-grid telemetry.','Hyderabad','hybrid',27000,'2027-01-20 23:59:00','https://apply.example.com/o/14'),

(7,'CodeSprint 2026 National Hackathon','hackathon','36-hour national finals with problem statements from industry.','Chennai','onsite',NULL,'2026-11-05 23:59:00','https://apply.example.com/o/15'),
(10,'OpenCampus Build-a-thon','hackathon','Weekend online build event for open-source student tools.','Remote (India)','remote',NULL,'2026-11-12 23:59:00','https://apply.example.com/o/16'),
(8,'FinEdge FinTech Challenge','hackathon','Prototype a fraud-detection or UPI-analytics tool.','Mumbai','hybrid',NULL,'2026-12-01 23:59:00','https://apply.example.com/o/17'),
(2,'DataForge Data Science Cup','hackathon','Kaggle-style prediction contest with cash prizes.','Remote (India)','remote',NULL,'2026-11-22 23:59:00','https://apply.example.com/o/18'),
(7,'HackForGood Social Impact','hackathon','Build tech for NGOs in education and health access.','Bengaluru','onsite',NULL,'2026-12-12 23:59:00','https://apply.example.com/o/19'),
(9,'RoboVision Vision Challenge','hackathon','Real-time object detection on edge hardware.','Bengaluru','onsite',NULL,'2027-01-08 23:59:00','https://apply.example.com/o/20'),
(5,'CloudNest Cloud Jam','hackathon','Design a resilient multi-region architecture in 24 hours.','Remote (India)','remote',NULL,'2026-12-18 23:59:00','https://apply.example.com/o/21'),
(4,'PixelCraft Game Jam','hackathon','Create a playable game prototype in 48 hours.','Pune','hybrid',NULL,'2027-01-25 23:59:00','https://apply.example.com/o/22'),

(1,'Software Engineer (Graduate)','job','Full-time role on the core platform team.','Bengaluru','hybrid',90000,'2026-12-31 23:59:00','https://apply.example.com/o/23'),
(2,'Junior Data Scientist','job','Own forecasting models from prototype to production.','Chennai','onsite',80000,'2027-01-05 23:59:00','https://apply.example.com/o/24'),
(5,'Associate DevOps Engineer','job','Operate Kubernetes clusters and deployment tooling.','Chennai','hybrid',75000,'2027-01-15 23:59:00','https://apply.example.com/o/25'),
(8,'Backend Developer','job','Design transaction-processing APIs in Java.','Mumbai','onsite',100000,'2027-01-20 23:59:00','https://apply.example.com/o/26'),
(4,'Frontend Engineer','job','Build performant React and TypeScript UIs.','Remote (India)','remote',70000,'2026-12-28 23:59:00','https://apply.example.com/o/27'),
(3,'Embedded Software Engineer','job','Write real-time firmware for grid controllers.','Hyderabad','onsite',72000,'2027-01-31 23:59:00','https://apply.example.com/o/28'),
(8,'Cybersecurity Associate','job','Monitor threats and run incident response.','Mumbai','hybrid',85000,'2027-02-05 23:59:00','https://apply.example.com/o/29'),
(1,'QA Automation Engineer','job','Automate regression suites for web services.','Bengaluru','hybrid',65000,'2026-11-28 23:59:00','https://apply.example.com/o/30'),
(2,'Data Engineer','job','Build and maintain batch and streaming pipelines.','Remote (India)','remote',95000,'2027-02-10 23:59:00','https://apply.example.com/o/31'),
(5,'Cloud Engineer','job','Provision and secure cloud environments for clients.','Chennai','hybrid',88000,'2027-02-15 23:59:00','https://apply.example.com/o/32'),

(6,'Computer Vision Research Assistant','research','Assist with medical-image segmentation experiments.','Chennai','onsite',15000,'2026-11-14 23:59:00','https://apply.example.com/o/33'),
(6,'NLP Research Intern','research','Low-resource language modelling for Indian languages.','Chennai','hybrid',15000,'2026-12-08 23:59:00','https://apply.example.com/o/34'),
(9,'Robotics Perception Research','research','Sensor fusion for indoor mobile robots.','Bengaluru','onsite',20000,'2026-12-22 23:59:00','https://apply.example.com/o/35'),
(6,'Reinforcement Learning Project','research','Benchmark RL algorithms on scheduling problems.','Remote (India)','remote',12000,'2027-01-12 23:59:00','https://apply.example.com/o/36'),
(3,'Smart Grid Analytics Research','research','Statistical load-forecasting study with utility data.','Hyderabad','hybrid',14000,'2027-01-18 23:59:00','https://apply.example.com/o/37'),
(9,'Embedded AI Research Fellow','research','Run neural networks on microcontrollers.','Bengaluru','onsite',18000,'2027-02-01 23:59:00','https://apply.example.com/o/38'),
(6,'Federated Learning Study','research','Privacy-preserving training across hospitals.','Remote (India)','remote',12000,'2027-01-30 23:59:00','https://apply.example.com/o/39'),
(10,'Open Source Tooling Research','research','Study contributor onboarding in OSS projects.','Remote (India)','remote',10000,'2027-02-20 23:59:00','https://apply.example.com/o/40');

-- (opportunity_id, skill_id, is_mandatory)
INSERT INTO OpportunitySkills (opportunity_id, skill_id, is_mandatory) VALUES
(1,1,1),(1,8,1),(1,11,1),(1,14,0),
(2,4,1),(2,6,1),(2,10,1),(2,5,0),
(3,11,1),(3,1,1),(3,24,1),(3,25,0),
(4,1,1),(4,21,1),(4,24,1),(4,23,0),
(5,29,1),(5,3,1),(5,28,0),
(6,26,1),(6,10,0),(6,27,0),
(7,15,1),(7,18,1),(7,14,1),(7,16,0),
(8,17,1),(8,18,1),(8,27,0),
(9,6,1),(9,7,1),(9,12,1),(9,5,0),
(10,30,1),(10,18,1),(10,1,0),
(11,1,1),(11,9,1),(11,11,0),
(12,11,1),(12,25,1),(12,27,0),
(13,10,1),(13,4,1),(13,14,0),
(14,1,1),(14,11,1),(14,15,0),(14,17,0),
(15,28,1),(15,19,0),(15,14,0),
(16,6,0),(16,7,0),(16,14,1),
(17,1,1),(17,11,0),(17,30,0),
(18,1,1),(18,21,1),(18,25,0),
(19,27,1),(19,4,0),(19,28,0),
(20,1,1),(20,22,1),(20,23,0),
(21,17,1),(21,15,0),(21,18,0),
(22,3,1),(22,28,0),(22,20,0),
(23,2,1),(23,19,1),(23,20,1),(23,11,0),
(24,1,1),(24,21,1),(24,25,1),(24,24,0),
(25,15,1),(25,16,1),(25,18,1),(25,17,0),
(26,2,1),(26,12,1),(26,7,0),(26,14,0),
(27,6,1),(27,5,1),(27,10,1),
(28,29,1),(28,3,1),(28,18,0),
(29,30,1),(29,18,1),(29,1,0),
(30,2,1),(30,11,0),(30,14,0),(30,28,0),
(31,1,1),(31,11,1),(31,15,0),(31,17,0),
(32,17,1),(32,15,1),(32,16,0),(32,18,0),
(33,1,1),(33,22,1),(33,21,0),
(34,1,1),(34,21,1),(34,22,0),
(35,3,1),(35,1,0),(35,22,0),
(36,1,1),(36,21,1),(36,25,0),
(37,1,1),(37,25,1),(37,24,0),
(38,29,1),(38,21,0),(38,1,0),
(39,1,1),(39,22,1),(39,23,0),
(40,14,1),(40,1,0),(40,27,0);

-- (opportunity_id, min_cgpa, allowed_branches, allowed_years)  NULL = no restriction
INSERT INTO OpportunityEligibility (opportunity_id, min_cgpa, allowed_branches, allowed_years) VALUES
(1,7.5,'CSE,IT','3,4'),(2,7.0,'CSE,IT,ECE','2,3,4'),(3,7.0,NULL,'3,4'),(4,8.0,'CSE,IT','3,4'),
(5,7.0,'ECE,MECH','3,4'),(6,NULL,NULL,NULL),(7,7.0,'CSE,IT','3,4'),(8,6.5,'CSE,IT,ECE','3,4'),
(9,7.5,'CSE,IT','3,4'),(10,7.5,'CSE,IT,ECE','3,4'),(11,7.0,'CSE,IT','2,3,4'),(12,6.5,NULL,'3,4'),
(13,NULL,NULL,'2,3,4'),(14,8.0,'CSE,IT','3,4'),
(15,NULL,NULL,NULL),(16,NULL,NULL,NULL),(17,7.0,'CSE,IT',NULL),(18,NULL,NULL,NULL),
(19,NULL,NULL,NULL),(20,NULL,NULL,NULL),(21,NULL,NULL,NULL),(22,NULL,NULL,NULL),
(23,7.5,'CSE,IT','4'),(24,8.0,'CSE,IT','4'),(25,7.0,'CSE,IT,ECE','4'),(26,8.0,'CSE,IT','4'),
(27,7.0,'CSE,IT','4'),(28,7.0,'ECE','4'),(29,7.5,'CSE,IT,ECE','4'),(30,6.5,NULL,'4'),
(31,8.0,'CSE,IT','4'),(32,7.5,'CSE,IT,ECE','4'),
(33,8.0,'CSE,IT,ECE','3,4'),(34,8.0,'CSE,IT','3,4'),(35,7.5,'CSE,ECE','3,4'),(36,8.5,'CSE,IT','3,4'),
(37,7.0,'ECE,MECH','3,4'),(38,7.5,'ECE,CSE','3,4'),(39,8.0,NULL,'3,4'),(40,NULL,NULL,'2,3,4');

INSERT INTO StudentSkills (student_id, skill_id, proficiency) VALUES
(1,1,'advanced'),(1,8,'intermediate'),(1,11,'intermediate'),(1,12,'intermediate'),(1,14,'intermediate'),(1,19,'intermediate'),(1,10,'beginner'),
(2,4,'advanced'),(2,6,'advanced'),(2,5,'intermediate'),(2,7,'intermediate'),(2,10,'advanced'),(2,14,'advanced'),(2,12,'beginner'),(2,26,'beginner'),
(3,3,'intermediate'),(3,29,'advanced'),(3,18,'intermediate'),(3,1,'beginner'),(3,28,'intermediate'),
(4,1,'intermediate'),(4,2,'intermediate'),(4,19,'intermediate'),(4,20,'beginner'),(4,21,'beginner'),(4,24,'beginner'),(4,25,'beginner'),
(5,1,'beginner'),(5,3,'beginner'),(5,27,'intermediate'),(5,28,'beginner'),
(6,2,'advanced'),(6,11,'advanced'),(6,12,'advanced'),(6,15,'intermediate'),(6,17,'beginner'),(6,18,'intermediate'),(6,14,'advanced'),(6,19,'advanced'),(6,20,'intermediate');

INSERT INTO Projects (student_id, title, description, repo_link) VALUES
(1,'Expense Tracker API','REST API for personal expenses with Flask and MySQL.','https://github.com/example/expense-tracker'),
(1,'Campus Chatbot','FAQ chatbot for college admissions using simple ML.','https://github.com/example/campus-chatbot'),
(2,'Portfolio Website','Responsive personal portfolio built with React.','https://github.com/example/portfolio'),
(2,'Task Board','Kanban board with React, TypeScript and Node.js.','https://github.com/example/task-board'),
(3,'Line Following Robot','Arduino-based robot with PID control in Embedded C.',NULL),
(4,'Movie Recommender','Collaborative-filtering recommender using Pandas.','https://github.com/example/movie-recs'),
(6,'Library Management System','Java desktop app backed by MySQL.','https://github.com/example/library-mgmt'),
(6,'Dockerised Blog','Blog deployed with Docker on an AWS instance.','https://github.com/example/docker-blog');

INSERT INTO ProjectSkills (project_id, skill_id) VALUES
(1,1),(1,8),(1,12),(2,1),(2,21),(3,4),(3,6),(3,10),(4,5),(4,6),(4,7),
(5,29),(5,3),(6,1),(6,24),(6,21),(7,2),(7,12),(8,15),(8,17),(8,18);

-- Applications are inserted in their INITIAL status; trigger logs row 1 of each history.
INSERT INTO Applications (student_id, opportunity_id, status, applied_at) VALUES
(1,1,'applied','2026-10-05 10:00:00'),(1,11,'saved','2026-10-08 12:15:00'),
(1,3,'applied','2026-10-09 09:40:00'),(1,15,'applied','2026-10-10 16:20:00'),
(1,7,'saved','2026-10-16 18:00:00'),(1,8,'saved','2026-10-16 18:05:00'),
(1,9,'saved','2026-10-17 09:30:00'),(1,14,'saved','2026-10-17 09:35:00'),
(2,2,'applied','2026-10-03 11:05:00'),(2,9,'saved','2026-10-11 20:30:00'),(2,16,'applied','2026-10-12 14:10:00'),
(3,5,'applied','2026-10-04 08:50:00'),(3,28,'saved','2026-10-13 19:45:00'),
(4,13,'applied','2026-10-06 13:25:00'),(4,18,'saved','2026-10-12 17:00:00'),(4,40,'saved','2026-10-14 10:10:00'),
(6,25,'applied','2026-10-02 09:00:00'),(6,32,'applied','2026-10-07 15:35:00'),(6,7,'saved','2026-10-15 18:20:00'),
(5,37,'applied','2026-10-10 11:50:00'),(5,15,'saved','2026-10-16 21:05:00');

-- Later transitions (what PATCH /applications/{id}/status would write): history row + status update
INSERT INTO ApplicationStatusHistory (application_id, old_status, new_status, note, changed_at) VALUES
(1,'applied','shortlisted','Resume shortlisted','2026-10-12 10:30:00'),
(1,'shortlisted','interview','Technical round scheduled','2026-10-16 15:00:00'),
(4,'applied','shortlisted','Selected for the final round','2026-10-14 09:00:00'),
(9,'applied','shortlisted','Portfolio reviewed','2026-10-10 12:00:00'),
(9,'shortlisted','interview','Interview with engineering manager','2026-10-15 11:30:00'),
(9,'interview','offered','Offer letter sent','2026-10-18 17:45:00'),
(12,'applied','rejected','Not selected for this round','2026-10-14 16:00:00'),
(14,'applied','shortlisted','Moved to assignment stage','2026-10-14 12:00:00'),
(17,'applied','shortlisted','Profile matched the role','2026-10-09 10:15:00'),
(17,'shortlisted','interview','Panel interview scheduled','2026-10-17 14:30:00'),
(20,'applied','withdrawn','Withdrew; clashes with exams','2026-10-15 20:00:00');

UPDATE Applications SET status = 'interview'   WHERE application_id IN (1, 17);
UPDATE Applications SET status = 'shortlisted' WHERE application_id IN (4, 14);
UPDATE Applications SET status = 'offered'     WHERE application_id = 9;
UPDATE Applications SET status = 'rejected'    WHERE application_id = 12;
UPDATE Applications SET status = 'withdrawn'   WHERE application_id = 20;

INSERT INTO Reminders (student_id, opportunity_id, remind_at, message, is_sent) VALUES
(1,3,'2026-11-08 09:00:00','Data Analyst Intern deadline in 2 days',0),
(1,1,'2026-11-13 09:00:00','Backend intern deadline is close',0),
(2,9,'2026-11-16 18:00:00','Finish the Full Stack Intern application',0),
(3,28,'2027-01-24 10:00:00','Embedded role closes in a week',0),
(4,18,'2026-11-20 10:00:00','Register team for the Data Science Cup',0),
(6,32,'2027-02-08 09:00:00','Cloud Engineer deadline approaching',0),
(2,2,'2026-10-14 09:00:00','Follow up on the frontend internship',1);