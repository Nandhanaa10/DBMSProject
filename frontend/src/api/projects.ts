import type { Project, ProjectInput } from '../types/student';
import { USE_MOCKS, api } from './client';
import { mock } from '../mocks/personA';

export const projectsApi = {
  list: (): Promise<Project[]> => (USE_MOCKS ? mock.projects() : api.get<Project[]>('/projects?limit=100').then((r) => r.data)),
  create: (input: ProjectInput): Promise<Project> =>
    USE_MOCKS ? mock.createProject(input) : api.post<Project>('/projects', input).then((r) => r.data),
  update: (id: number, input: ProjectInput): Promise<Project> =>
    USE_MOCKS ? mock.updateProject(id, input) : api.put<Project>(`/projects/${id}`, input).then((r) => r.data),
  remove: async (id: number): Promise<void> => {
    if (USE_MOCKS) return mock.deleteProject(id);
    await api.delete(`/projects/${id}`);
  },
};
