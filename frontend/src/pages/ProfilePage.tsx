import { useEffect, useState, type FormEvent } from 'react';
import { errMsg } from '../api/client';
import { studentsApi } from '../api/students';
import { Alert, Button, Card, Field, Spinner, inputCls } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { BRANCHES, YEARS, type Student } from '../types/student';

interface Form { name: string; college: string; branch: string; year: string; cgpa: string }
const toForm = (s: Student): Form => ({ name: s.name, college: s.college, branch: s.branch, year: String(s.year), cgpa: String(s.cgpa) });

export default function ProfilePage() {
  const { setDisplayName } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    studentsApi.me().then((s) => { setStudent(s); setForm(toForm(s)); }).catch((e) => setError(errMsg(e)));
  }, []);

  if (!form || !student) return error ? <Alert>{error}</Alert> : <Spinner label="Loading profile…" />;

  const set = (key: keyof Form) => (e: { target: { value: string } }) => {
    setSaved(false);
    setForm((f) => (f ? { ...f, [key]: e.target.value } : f));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    const cgpa = Number(form.cgpa);
    if (form.name.trim().length < 2 || form.college.trim().length < 2) return setError('Name and college are required.');
    if (Number.isNaN(cgpa) || cgpa < 0 || cgpa > 10) return setError('CGPA must be between 0 and 10.');
    setBusy(true);
    try {
      const updated = await studentsApi.update({
        name: form.name.trim(), college: form.college.trim(), branch: form.branch, year: Number(form.year), cgpa,
      });
      setStudent(updated); setForm(toForm(updated)); setDisplayName(updated.name); setSaved(true);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Your profile</h1>
      <Card>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error && <Alert>{error}</Alert>}
          {saved && <Alert kind="success">Profile updated.</Alert>}
          <Field label="Email" hint="Your email is your login and cannot be changed here.">
            <input className={inputCls} value={student.email} disabled />
          </Field>
          <Field label="Full name"><input className={inputCls} value={form.name} onChange={set('name')} /></Field>
          <Field label="College"><input className={inputCls} value={form.college} onChange={set('college')} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Branch">
              <select className={inputCls} value={form.branch} onChange={set('branch')}>
                {[...new Set([form.branch, ...BRANCHES])].map((b) => <option key={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Year">
              <select className={inputCls} value={form.year} onChange={set('year')}>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
            <Field label="CGPA">
              <input className={inputCls} type="number" step="0.01" min="0" max="10" value={form.cgpa} onChange={set('cgpa')} />
            </Field>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Member since {new Date(student.created_at).toLocaleDateString()}</span>
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
