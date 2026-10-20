# ER Diagram — OpportunityHub + SkillPath

Render with any Mermaid viewer (GitHub, VS Code "Markdown Preview Mermaid", mermaid.live).

```mermaid
erDiagram
  Students ||--o{ StudentSkills : "has"
  Skills ||--o{ StudentSkills : "known by"
  Organizations ||--o{ Opportunities : "posts"
  Opportunities ||--o{ OpportunitySkills : "requires"
  Skills ||--o{ OpportunitySkills : "required by"
  Opportunities ||--o| OpportunityEligibility : "restricted by"
  Students ||--o{ Applications : "submits"
  Opportunities ||--o{ Applications : "receives"
  Applications ||--o{ ApplicationStatusHistory : "logs"
  Students ||--o{ Projects : "owns"
  Projects ||--o{ ProjectSkills : "uses"
  Skills ||--o{ ProjectSkills : "used in"
  Students ||--o{ Reminders : "sets"
  Opportunities ||--o{ Reminders : "about"

  Students {
    int student_id PK
    varchar name
    varchar email UK
    varchar password_hash
    varchar college
    varchar branch
    tinyint year "CHECK 1-4"
    decimal cgpa "CHECK 0-10"
    datetime created_at
  }
  Organizations {
    int organization_id PK
    varchar name UK
    varchar type
    varchar website
    varchar location
  }
  Opportunities {
    int opportunity_id PK
    int organization_id FK
    varchar title
    enum type "internship|hackathon|job|research"
    text description
    varchar location
    enum mode "remote|onsite|hybrid"
    decimal stipend "CHECK >= 0"
    datetime deadline
    varchar apply_link
    datetime created_at
  }
  Skills {
    int skill_id PK
    varchar skill_name UK
    varchar category
  }
  StudentSkills {
    int student_id PK, FK
    int skill_id PK, FK
    enum proficiency "beginner|intermediate|advanced"
  }
  OpportunitySkills {
    int opportunity_id PK, FK
    int skill_id PK, FK
    tinyint is_mandatory
  }
  OpportunityEligibility {
    int eligibility_id PK
    int opportunity_id FK, UK
    decimal min_cgpa
    varchar allowed_branches "CSV, NULL = any"
    varchar allowed_years "CSV, NULL = any"
  }
  Applications {
    int application_id PK
    int student_id FK
    int opportunity_id FK
    enum status "saved|applied|shortlisted|interview|offered|rejected|withdrawn"
    datetime applied_at
  }
  ApplicationStatusHistory {
    int history_id PK
    int application_id FK
    enum old_status "NULL on first row"
    enum new_status
    varchar note
    datetime changed_at
  }
  Projects {
    int project_id PK
    int student_id FK
    varchar title
    text description
    varchar repo_link
  }
  ProjectSkills {
    int project_id PK, FK
    int skill_id PK, FK
  }
  Reminders {
    int reminder_id PK
    int student_id FK
    int opportunity_id FK
    datetime remind_at
    varchar message
    tinyint is_sent
  }
```

**Relationship summary**

| Relationship | Cardinality | Implemented by |
|---|---|---|
| Students — Skills | M:N | `StudentSkills` (+ `proficiency`) |
| Opportunities — Skills | M:N | `OpportunitySkills` (+ `is_mandatory`) |
| Projects — Skills | M:N | `ProjectSkills` |
| Students — Opportunities | M:N | `Applications` (+ `status`, `applied_at`), `UNIQUE(student_id, opportunity_id)` |
| Organizations — Opportunities | 1:N | `Opportunities.organization_id` |
| Opportunities — Eligibility | 1:0..1 | `OpportunityEligibility.opportunity_id UNIQUE` |
| Applications — History | 1:N | `ApplicationStatusHistory.application_id` |
| Students — Projects / Reminders | 1:N | FK on the child |