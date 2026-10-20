import type { ProfileUpdate, Student } from '../types/student';
import { USE_MOCKS, api } from './client';
import { mock } from '../mocks/personA';

export const studentsApi = {
  me: (): Promise<Student> => (USE_MOCKS ? mock.me() : api.get<Student>('/students/me').then((r) => r.data)),
  update: (patch: ProfileUpdate): Promise<Student> =>
    USE_MOCKS ? mock.updateMe(patch) : api.put<Student>('/students/me', patch).then((r) => r.data),
};
