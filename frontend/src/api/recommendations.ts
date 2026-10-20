import type { SkillGapItem } from '../types/student';
import { USE_MOCKS, api } from './client';
import { mock } from '../mocks/personA';

export const recommendationsApi = {
  skillGap: (): Promise<SkillGapItem[]> =>
    USE_MOCKS ? mock.skillGap() : api.get<SkillGapItem[]>('/recommendations/skill-gap?limit=10').then((r) => r.data),
};
