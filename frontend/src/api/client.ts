// ASSUMED shape of Person C's client.ts (contract: USE_MOCKS flag + attaches JWT).
// If C's differs, only the imports in my api/*.ts files need to change.
import type { ApiErrorBody, ApiSuccess } from '../types/api';

export const USE_MOCKS: boolean = import.meta.env.VITE_USE_MOCKS === 'true';
const BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1';

const TOKEN_KEY = 'oh_token';
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export const errMsg = (e: unknown): string => (e instanceof Error ? e.message : 'Something went wrong');

async function request<T>(method: string, path: string, body?: unknown): Promise<ApiSuccess<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Cannot reach the server. Is the backend running?', 0);
  }

  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) {          // expired / invalid token => force logout
      tokenStore.clear();
      window.dispatchEvent(new Event('auth:logout'));
    }
    const err = (json as ApiErrorBody | null)?.error;
    throw new ApiError(err?.code ?? 'UNKNOWN', err?.message ?? `Request failed (${res.status})`, res.status);
  }
  return json as ApiSuccess<T>;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
