import type { Proficiency, Skill, StudentSkill } from '../types/student';
import { USE_MOCKS, api } from './client';
import { mock } from '../mocks/personA';

export const skillsApi = {
  search: (q = ''): Promise<Skill[]> =>
    USE_MOCKS ? mock.searchSkills(q)
      : api.get<Skill[]>(`/skills?q=${encodeURIComponent(q)}&limit=100`).then((r) => r.data),
  mine: (): Promise<StudentSkill[]> =>
    USE_MOCKS ? mock.mySkills() : api.get<StudentSkill[]>('/students/me/skills?limit=100').then((r) => r.data),
  add: (skill_id: number, proficiency: Proficiency): Promise<StudentSkill> =>
    USE_MOCKS ? mock.addSkill(skill_id, proficiency)
      : api.post<StudentSkill>('/students/me/skills', { skill_id, proficiency }).then((r) => r.data),
  update: (skill_id: number, proficiency: Proficiency): Promise<StudentSkill> =>
    USE_MOCKS ? mock.updateSkill(skill_id, proficiency)
      : api.put<StudentSkill>(`/students/me/skills/${skill_id}`, { proficiency }).then((r) => r.data),
  remove: async (skill_id: number): Promise<void> => {
    if (USE_MOCKS) return mock.removeSkill(skill_id);
    await api.delete(`/students/me/skills/${skill_id}`);
  },
};
