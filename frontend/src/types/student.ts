// Mirrors the JSON shapes of Person A's endpoints exactly (snake_case, ISO datetimes as strings).
export type Proficiency = 'beginner' | 'intermediate' | 'advanced';
export const PROFICIENCIES: Proficiency[] = ['beginner', 'intermediate', 'advanced'];

export const BRANCHES = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AIDS'];
export const YEARS = [1, 2, 3, 4];

export interface AuthStudent { student_id: number; name: string; email: string }
export interface LoginResponse { token: string; student: AuthStudent }

export interface RegisterPayload {
  name: string; email: string; password: string;
  college: string; branch: string; year: number; cgpa: number;
}

export interface Student {
  student_id: number; name: string; email: string; college: string;
  branch: string; year: number; cgpa: number; created_at: string;
}
export type ProfileUpdate = Pick<Student, 'name' | 'college' | 'branch' | 'year' | 'cgpa'>;

export interface Skill { skill_id: number; skill_name: string; category: string }
export interface StudentSkill extends Skill { proficiency: Proficiency }

export interface ProjectSkill { skill_id: number; skill_name: string }
export interface Project {
  project_id: number; title: string; description: string | null;
  repo_link: string | null; skills: ProjectSkill[];
}
export interface ProjectInput {
  title: string; description?: string | null; repo_link?: string | null; skill_ids?: number[];
}

export interface SkillGapItem { skill_id: number; skill_name: string; needed_by_count: number }
