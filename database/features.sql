-- OpportunityHub + SkillPath :: features.sql  (run AFTER schema.sql, BEFORE seed.sql; run once per fresh schema)
USE opportunityhub;

-- ===== 1. INDEXES on filter columns  [concept: B-tree indexes, composite index, leftmost-prefix rule] =====
CREATE INDEX idx_opportunities_type        ON Opportunities (type);                 -- WHERE type = ?
CREATE INDEX idx_opportunities_deadline    ON Opportunities (deadline);             -- deadline_before filter, ORDER BY deadline
CREATE INDEX idx_opportunityskills_skill   ON OpportunitySkills (skill_id);         -- skill_id filter; PK only covers opportunity_id first
CREATE INDEX idx_studentskills_skill       ON StudentSkills (skill_id);             -- reverse lookup: who has skill X
CREATE INDEX idx_applications_student_status ON Applications (student_id, status);  -- GET /applications?status=
CREATE INDEX idx_reminders_student_remind  ON Reminders (student_id, remind_at);    -- upcoming reminders per student
CREATE INDEX idx_history_app_changed       ON ApplicationStatusHistory (application_id, changed_at);

-- ===== 2. VIEW for dashboard counts  [concept: view, correlated scalar subqueries] =====
DROP VIEW IF EXISTS v_dashboard_counts;
CREATE VIEW v_dashboard_counts AS
SELECT s.student_id,
  (SELECT COUNT(*) FROM Applications a WHERE a.student_id = s.student_id AND a.status = 'applied')     AS applied,
  (SELECT COUNT(*) FROM Applications a WHERE a.student_id = s.student_id AND a.status = 'shortlisted') AS shortlisted,
  (SELECT COUNT(*) FROM Applications a WHERE a.student_id = s.student_id AND a.status = 'offered')     AS offers,
  (SELECT COUNT(*) FROM Reminders r    WHERE r.student_id = s.student_id AND r.is_sent = 0
                                         AND r.remind_at >= NOW())                                     AS upcoming_reminders
FROM Students s;
-- usage: SELECT applied, shortlisted, offers, upcoming_reminders FROM v_dashboard_counts WHERE student_id = ?;

-- ===== 3. TRIGGER: first history row for every new application  [concept: AFTER INSERT trigger, audit log] =====
DROP TRIGGER IF EXISTS trg_applications_after_insert;
DELIMITER $$
CREATE TRIGGER trg_applications_after_insert
AFTER INSERT ON Applications
FOR EACH ROW
BEGIN
  INSERT INTO ApplicationStatusHistory (application_id, old_status, new_status, note, changed_at)
  VALUES (NEW.application_id, NULL, NEW.status, 'Application created', NEW.applied_at);
END$$
DELIMITER ;

-- ===== 4. STORED PROCEDURE: skill gap  [concept: stored procedure, NOT EXISTS anti-join, GROUP BY, join] =====
DROP PROCEDURE IF EXISTS sp_skill_gap;
DELIMITER $$
CREATE PROCEDURE sp_skill_gap(IN p_student_id INT UNSIGNED, IN p_limit INT)
BEGIN
  SELECT sk.skill_id, sk.skill_name, COUNT(*) AS needed_by_count
  FROM Applications a
  JOIN OpportunitySkills os ON os.opportunity_id = a.opportunity_id
  JOIN Skills sk            ON sk.skill_id = os.skill_id
  WHERE a.student_id = p_student_id
    AND a.status IN ('saved','applied')
    AND NOT EXISTS (SELECT 1 FROM StudentSkills ss
                    WHERE ss.student_id = a.student_id AND ss.skill_id = os.skill_id)
  GROUP BY sk.skill_id, sk.skill_name
  ORDER BY needed_by_count DESC, sk.skill_name
  LIMIT p_limit;
END$$
DELIMITER ;
-- usage: CALL sp_skill_gap(1, 10);

-- ===== 5. DEMONSTRATION QUERIES (viva) =====

-- 5a. GROUP BY + HAVING: skills demanded by at least 4 opportunities  [concept: aggregation, HAVING filters groups]
SELECT sk.skill_name, COUNT(*) AS opportunities_needing, SUM(os.is_mandatory) AS as_mandatory
FROM Skills sk
JOIN OpportunitySkills os ON os.skill_id = sk.skill_id
GROUP BY sk.skill_id, sk.skill_name
HAVING COUNT(*) >= 4
ORDER BY opportunities_needing DESC, sk.skill_name;

-- 5b. Multi-table join (4 tables): pipeline of shortlisted/interview/offered applications  [concept: INNER JOINs]
SELECT s.name AS student, o.title, org.name AS organization, a.status, a.applied_at
FROM Applications a
JOIN Students s       ON s.student_id = a.student_id
JOIN Opportunities o  ON o.opportunity_id = a.opportunity_id
JOIN Organizations org ON org.organization_id = o.organization_id
WHERE a.status IN ('shortlisted','interview','offered')
ORDER BY a.status, s.name;

-- 5c. Scalar subquery: students with CGPA above the overall average  [concept: uncorrelated subquery]
SELECT student_id, name, cgpa FROM Students
WHERE cgpa > (SELECT AVG(cgpa) FROM Students)
ORDER BY cgpa DESC;

-- 5d. Correlated subquery: opportunities paying above the average of THEIR OWN type  [concept: correlated subquery]
SELECT o.opportunity_id, o.title, o.type, o.stipend
FROM Opportunities o
WHERE o.stipend > (SELECT AVG(o2.stipend) FROM Opportunities o2 WHERE o2.type = o.type)
ORDER BY o.type, o.stipend DESC;

-- 5e. LEFT JOIN + IS NULL: opportunities nobody has saved or applied to  [concept: outer join / anti-join]
SELECT o.opportunity_id, o.title
FROM Opportunities o
LEFT JOIN Applications a ON a.opportunity_id = o.opportunity_id
WHERE a.application_id IS NULL
ORDER BY o.deadline;
