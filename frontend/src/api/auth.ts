import type { LoginResponse, RegisterPayload } from '../types/student';
import { USE_MOCKS, api } from './client';
import { mock } from '../mocks/personA';

export const authApi = {
  login: (email: string, password: string): Promise<LoginResponse> =>
    USE_MOCKS ? mock.login(email, password) : api.post<LoginResponse>('/auth/login', { email, password }).then((r) => r.data),
  register: (payload: RegisterPayload): Promise<LoginResponse> =>
    USE_MOCKS ? mock.register(payload) : api.post<LoginResponse>('/auth/register', payload).then((r) => r.data),
};
