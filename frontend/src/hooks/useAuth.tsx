import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../api/auth';
import { tokenStore } from '../api/client';
import type { AuthStudent, LoginResponse, RegisterPayload } from '../types/student';

interface AuthContextValue {
  student: AuthStudent | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  setDisplayName: (name: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STUDENT_KEY = 'oh_student';

function readStoredStudent(): AuthStudent | null {
  try {
    const raw = localStorage.getItem(STUDENT_KEY);
    return tokenStore.get() && raw ? (JSON.parse(raw) as AuthStudent) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<AuthStudent | null>(readStoredStudent);

  const save = useCallback((res: LoginResponse) => {
    tokenStore.set(res.token);
    localStorage.setItem(STUDENT_KEY, JSON.stringify(res.student));
    setStudent(res.student);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    localStorage.removeItem(STUDENT_KEY);
    setStudent(null);
  }, []);

  // client.ts fires this when the API answers 401 with a stored token (expired / invalid).
  useEffect(() => {
    window.addEventListener('auth:logout', logout);
    return () => window.removeEventListener('auth:logout', logout);
  }, [logout]);

  const value = useMemo<AuthContextValue>(() => ({
    student,
    isAuthenticated: student !== null,
    login: async (email, password) => save(await authApi.login(email, password)),
    register: async (payload) => save(await authApi.register(payload)),
    logout,
    setDisplayName: (name) => setStudent((prev) => {
      if (!prev) return prev;
      const next = { ...prev, name };
      localStorage.setItem(STUDENT_KEY, JSON.stringify(next));
      return next;
    }),
  }), [student, save, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
