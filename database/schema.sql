-- OpportunityHub + SkillPath :: schema.sql  (MySQL 8.0.16+ so CHECK constraints are enforced)
-- Table names are PascalCase exactly as in the contract; on Linux MySQL they are case-sensitive.
CREATE DATABASE IF NOT EXISTS opportunityhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE opportunityhub;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS Reminders, ProjectSkills, Projects, ApplicationStatusHistory, Applications,
                     OpportunityEligibility, OpportunitySkills, StudentSkills,
                     Opportunities, Skills, Organizations, Students;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE Students (
  student_id    INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  college       VARCHAR(150)  NOT NULL,
  branch        VARCHAR(20)   NOT NULL,              -- upper-case code, e.g. CSE
  year          TINYINT UNSIGNED NOT NULL,
  cgpa          DECIMAL(4,2)  NOT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id),
  UNIQUE KEY uq_students_email (email),
  CONSTRAINT chk_students_year CHECK (year BETWEEN 1 AND 4),
  CONSTRAINT chk_students_cgpa CHECK (cgpa BETWEEN 0 AND 10)
) ENGINE=InnoDB;

CREATE TABLE Organizations (
  organization_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name     VARCHAR(150) NOT NULL,
  type     VARCHAR(50)  NOT NULL,                    -- company | startup | research_lab | community
  website  VARCHAR(255) NULL,
  location VARCHAR(100) NULL,
  PRIMARY KEY (organization_id),
  UNIQUE KEY uq_organizations_name (name)
) ENGINE=InnoDB;

CREATE TABLE Opportunities (
  opportunity_id  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  organization_id INT UNSIGNED NOT NULL,
  title       VARCHAR(200) NOT NULL,
  type        ENUM('internship','hackathon','job','research') NOT NULL,
  description TEXT NULL,
  location    VARCHAR(100) NULL,
  mode        ENUM('remote','onsite','hybrid') NOT NULL,
  stipend     DECIMAL(10,2) NULL,                    -- monthly INR; NULL for hackathons
  deadline    DATETIME NOT NULL,
  apply_link  VARCHAR(255) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (opportunity_id),
  CONSTRAINT fk_opp_org FOREIGN KEY (organization_id) REFERENCES Organizations (organization_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_opp_stipend CHECK (stipend IS NULL OR stipend >= 0)
) ENGINE=InnoDB;

CREATE TABLE Skills (
  skill_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  skill_name VARCHAR(60) NOT NULL,
  category   VARCHAR(50) NOT NULL,
  PRIMARY KEY (skill_id),
  UNIQUE KEY uq_skills_name (skill_name)
) ENGINE=InnoDB;

CREATE TABLE StudentSkills (                          -- M:N Students <-> Skills
  student_id  INT UNSIGNED NOT NULL,
  skill_id    INT UNSIGNED NOT NULL,
  proficiency ENUM('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
  PRIMARY KEY (student_id, skill_id),
  CONSTRAINT fk_ss_student FOREIGN KEY (student_id) REFERENCES Students (student_id) ON DELETE CASCADE,
  CONSTRAINT fk_ss_skill   FOREIGN KEY (skill_id)   REFERENCES Skills (skill_id)     ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE OpportunitySkills (                      -- M:N Opportunities <-> Skills
  opportunity_id INT UNSIGNED NOT NULL,
  skill_id       INT UNSIGNED NOT NULL,
  is_mandatory   TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (opportunity_id, skill_id),
  CONSTRAINT fk_os_opp   FOREIGN KEY (opportunity_id) REFERENCES Opportunities (opportunity_id) ON DELETE CASCADE,
  CONSTRAINT fk_os_skill FOREIGN KEY (skill_id)       REFERENCES Skills (skill_id)              ON DELETE CASCADE,
  CONSTRAINT chk_os_mand CHECK (is_mandatory IN (0,1))
) ENGINE=InnoDB;

CREATE TABLE OpportunityEligibility (                 -- optional 1:1 with Opportunities (no row = open to all)
  eligibility_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  opportunity_id   INT UNSIGNED NOT NULL,
  min_cgpa         DECIMAL(4,2) NULL,                 -- NULL = no CGPA limit
  allowed_branches VARCHAR(100) NULL,                 -- comma list 'CSE,IT' (no spaces); NULL = any branch
  allowed_years    VARCHAR(20)  NULL,                 -- comma list '3,4'; NULL = any year
  PRIMARY KEY (eligibility_id),
  UNIQUE KEY uq_elig_opp (opportunity_id),
  CONSTRAINT fk_elig_opp FOREIGN KEY (opportunity_id) REFERENCES Opportunities (opportunity_id) ON DELETE CASCADE,
  CONSTRAINT chk_elig_cgpa CHECK (min_cgpa IS NULL OR min_cgpa BETWEEN 0 AND 10)
) ENGINE=InnoDB;

CREATE TABLE Applications (
  application_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id     INT UNSIGNED NOT NULL,
  opportunity_id INT UNSIGNED NOT NULL,
  status ENUM('saved','applied','shortlisted','interview','offered','rejected','withdrawn')
         NOT NULL DEFAULT 'saved',
  applied_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (application_id),
  UNIQUE KEY uq_app_student_opp (student_id, opportunity_id),   -- duplicate => 409 in the API
  CONSTRAINT fk_app_student FOREIGN KEY (student_id)     REFERENCES Students (student_id)         ON DELETE CASCADE,
  CONSTRAINT fk_app_opp     FOREIGN KEY (opportunity_id) REFERENCES Opportunities (opportunity_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE ApplicationStatusHistory (
  history_id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  application_id INT UNSIGNED NOT NULL,
  old_status ENUM('saved','applied','shortlisted','interview','offered','rejected','withdrawn') NULL,
  new_status ENUM('saved','applied','shortlisted','interview','offered','rejected','withdrawn') NOT NULL,
  note       VARCHAR(255) NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (history_id),
  CONSTRAINT fk_hist_app FOREIGN KEY (application_id) REFERENCES Applications (application_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE Projects (
  project_id  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id  INT UNSIGNED NOT NULL,
  title       VARCHAR(150) NOT NULL,
  description TEXT NULL,
  repo_link   VARCHAR(255) NULL,
  PRIMARY KEY (project_id),
  CONSTRAINT fk_proj_student FOREIGN KEY (student_id) REFERENCES Students (student_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE ProjectSkills (
  project_id INT UNSIGNED NOT NULL,
  skill_id   INT UNSIGNED NOT NULL,
  PRIMARY KEY (project_id, skill_id),
  CONSTRAINT fk_ps_project FOREIGN KEY (project_id) REFERENCES Projects (project_id) ON DELETE CASCADE,
  CONSTRAINT fk_ps_skill   FOREIGN KEY (skill_id)   REFERENCES Skills (skill_id)     ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE Reminders (
  reminder_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id     INT UNSIGNED NOT NULL,
  opportunity_id INT UNSIGNED NOT NULL,
  remind_at      DATETIME NOT NULL,
  message        VARCHAR(255) NOT NULL,
  is_sent        TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (reminder_id),
  CONSTRAINT fk_rem_student FOREIGN KEY (student_id)     REFERENCES Students (student_id)         ON DELETE CASCADE,
  CONSTRAINT fk_rem_opp     FOREIGN KEY (opportunity_id) REFERENCES Opportunities (opportunity_id) ON DELETE CASCADE,
  CONSTRAINT chk_rem_sent CHECK (is_sent IN (0,1))
) ENGINE=InnoDB;