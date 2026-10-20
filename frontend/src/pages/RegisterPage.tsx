import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { errMsg } from '../api/client';
import { Alert, AuthCard, Button, Field, inputCls } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { BRANCHES, YEARS } from '../types/student';

interface Form { name: string; email: string; password: string; college: string; branch: string; year: string; cgpa: string }
type Errors = Partial<Record<keyof Form, string>>;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function validate(f: Form): Errors {
  const e: Errors = {};
  if (f.name.trim().length < 2) e.name = 'Enter your full name.';
  if (!EMAIL_RE.test(f.email.trim())) e.email = 'Enter a valid email.';
  if (f.password.length < 8) e.password = 'Use at least 8 characters.';
  if (f.college.trim().length < 2) e.college = 'Enter your college.';
  if (!f.branch) e.branch = 'Choose your branch.';
  if (!f.year) e.year = 'Choose your year.';
  const cgpa = Number(f.cgpa);
  if (f.cgpa === '' || Number.isNaN(cgpa) || cgpa < 0 || cgpa > 10) e.cgpa = 'CGPA must be between 0 and 10.';
  return e;
}

export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<Form>({ name: '', email: '', password: '', college: '', branch: '', year: '', cgpa: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) return <Navigate to="/profile" replace />;

  const set = (key: keyof Form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await register({
        name: form.name.trim(), email: form.email.trim(), password: form.password, college: form.college.trim(),
        branch: form.branch, year: Number(form.year), cgpa: Number(form.cgpa),
      });
      navigate('/my-skills', { replace: true });      // next step: add skills
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Create your account" subtitle="Branch, year and CGPA are used to check your eligibility.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <Alert>{error}</Alert>}
        <Field label="Full name" error={errors.name}><input className={inputCls} value={form.name} onChange={set('name')} /></Field>
        <Field label="Email" error={errors.email}><input className={inputCls} type="email" autoComplete="email" value={form.email} onChange={set('email')} /></Field>
        <Field label="Password" error={errors.password} hint="At least 8 characters.">
          <input className={inputCls} type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />
        </Field>
        <Field label="College" error={errors.college}><input className={inputCls} value={form.college} onChange={set('college')} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Branch" error={errors.branch}>
            <select className={inputCls} value={form.branch} onChange={set('branch')}>
              <option value="">Select</option>{BRANCHES.map((b) => <option key={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Year" error={errors.year}>
            <select className={inputCls} value={form.year} onChange={set('year')}>
              <option value="">Select</option>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
          <Field label="CGPA" error={errors.cgpa}>
            <input className={inputCls} type="number" step="0.01" min="0" max="10" value={form.cgpa} onChange={set('cgpa')} />
          </Field>
        </div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        Already registered? <Link to="/login" className="font-medium text-indigo-600 hover:underline">Log in</Link>
      </p>
    </AuthCard>
  );
}
