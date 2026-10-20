// In-memory mock backend for Person A's endpoints (used when VITE_USE_MOCKS=true).
import { ApiError } from '../api/client';
import type {
  AuthStudent, LoginResponse, Proficiency, Project, ProjectInput, ProfileUpdate,
  RegisterPayload, Skill, SkillGapItem, Student, StudentSkill,
} from '../types/student';

const delay = <T>(value: T, ms = 250) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

const catalog: Skill[] = [
  [1, 'Python', 'Programming'], [2, 'Java', 'Programming'], [3, 'C++', 'Programming'],
  [4, 'JavaScript', 'Programming'], [6, 'React', 'Web'], [7, 'Node.js', 'Web'], [8, 'Flask', 'Web'],
  [11, 'SQL', 'Database'], [12, 'MySQL', 'Database'], [14, 'Git', 'DevOps'], [15, 'Docker', 'DevOps'],
  [17, 'AWS', 'Cloud'], [18, 'Linux', 'DevOps'], [21, 'Machine Learning', 'Data & AI'],
].map(([skill_id, skill_name, category]) => ({ skill_id, skill_name, category }) as Skill);

let me: Student = {
  student_id: 1, name: 'Demo Student', email: 'demo@example.edu', college: 'Anna University',
  branch: 'CSE', year: 3, cgpa: 8.4, created_at: '2026-09-01T10:00:00',
};
let mySkills: { skill_id: number; proficiency: Proficiency }[] = [
  { skill_id: 1, proficiency: 'advanced' }, { skill_id: 8, proficiency: 'intermediate' },
  { skill_id: 11, proficiency: 'intermediate' },
];
let projects: Project[] = [{
  project_id: 1, title: 'Expense Tracker API', description: 'REST API with Flask and MySQL.',
  repo_link: 'https://github.com/example/expense-tracker',
  skills: [{ skill_id: 1, skill_name: 'Python' }, { skill_id: 8, skill_name: 'Flask' }],
}];
let nextProjectId = 2;
const gapData: SkillGapItem[] = [
  { skill_id: 15, skill_name: 'Docker', needed_by_count: 2 },
  { skill_id: 17, skill_name: 'AWS', needed_by_count: 2 },
  { skill_id: 18, skill_name: 'Linux', needed_by_count: 2 },
  { skill_id: 6, skill_name: 'React', needed_by_count: 1 },
];

const nameOf = (id: number) => catalog.find((s) => s.skill_id === id)?.skill_name ?? `Skill ${id}`;
const joinSkill = (m: { skill_id: number; proficiency: Proficiency }): StudentSkill => {
  const s = catalog.find((c) => c.skill_id === m.skill_id)!;
  return { ...s, proficiency: m.proficiency };
};
const auth = (): LoginResponse => ({
  token: 'mock-token',
  student: { student_id: me.student_id, name: me.name, email: me.email } as AuthStudent,
});

export const mock = {
  login: (email: string, password: string) => {
    if (!email || password.length < 1) return Promise.reject(new ApiError('INVALID_CREDENTIALS', 'Invalid email or password', 401));
    me = { ...me, email };
    return delay(auth());
  },
  register: (p: RegisterPayload) => {
    me = { ...me, name: p.name, email: p.email, college: p.college, branch: p.branch, year: p.year, cgpa: p.cgpa };
    mySkills = []; projects = [];
    return delay(auth());
  },
  me: () => delay({ ...me }),
  updateMe: (p: ProfileUpdate) => { me = { ...me, ...p }; return delay({ ...me }); },

  searchSkills: (q: string) =>
    delay(catalog.filter((s) => s.skill_name.toLowerCase().includes(q.trim().toLowerCase()))),
  mySkills: () => delay(mySkills.map(joinSkill)),
  addSkill: (skill_id: number, proficiency: Proficiency) => {
    if (mySkills.some((s) => s.skill_id === skill_id))
      return Promise.reject(new ApiError('CONFLICT', 'You already have this skill', 409));
    const row = { skill_id, proficiency };
    mySkills = [...mySkills, row];
    return delay(joinSkill(row));
  },
  updateSkill: (skill_id: number, proficiency: Proficiency) => {
    mySkills = mySkills.map((s) => (s.skill_id === skill_id ? { ...s, proficiency } : s));
    return delay(joinSkill({ skill_id, proficiency }));
  },
  removeSkill: (skill_id: number) => {
    mySkills = mySkills.filter((s) => s.skill_id !== skill_id);
    return delay(undefined);
  },

  projects: () => delay([...projects]),
  createProject: (input: ProjectInput) => {
    const p: Project = {
      project_id: nextProjectId++, title: input.title, description: input.description ?? null,
      repo_link: input.repo_link ?? null,
      skills: (input.skill_ids ?? []).map((id) => ({ skill_id: id, skill_name: nameOf(id) })),
    };
    projects = [p, ...projects];
    return delay(p);
  },
  updateProject: (id: number, input: ProjectInput) => {
    projects = projects.map((p) => p.project_id !== id ? p : {
      ...p, title: input.title, description: input.description ?? null, repo_link: input.repo_link ?? null,
      skills: input.skill_ids ? input.skill_ids.map((s) => ({ skill_id: s, skill_name: nameOf(s) })) : p.skills,
    });
    return delay(projects.find((p) => p.project_id === id)!);
  },
  deleteProject: (id: number) => { projects = projects.filter((p) => p.project_id !== id); return delay(undefined); },

  skillGap: () => delay(gapData.filter((g) => !mySkills.some((s) => s.skill_id === g.skill_id))),
};
