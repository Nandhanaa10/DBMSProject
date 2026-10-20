import { useState, type FormEvent } from 'react';
import { errMsg } from '../api/client';
import type { Project, ProjectInput, Skill } from '../types/student';
import { Alert, Button, Field, inputCls } from './ui';

interface Props {
  initial?: Project;
  catalog: Skill[];
  onSubmit: (input: ProjectInput) => Promise<void>;
  onCancel: () => void;
}

export default function ProjectForm({ initial, catalog, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [repoLink, setRepoLink] = useState(initial?.repo_link ?? '');
  const [selected, setSelected] = useState<Set<number>>(new Set(initial?.skills.map((s) => s.skill_id) ?? []));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = (id: number) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError('Give your project a title.');
    if (repoLink.trim() && !/^https?:\/\//i.test(repoLink.trim())) return setError('Repository link must start with http:// or https://');
    setBusy(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        repo_link: repoLink.trim() || null,
        skill_ids: [...selected],
      });
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && <Alert>{error}</Alert>}
      <Field label="Title"><input className={inputCls} value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field label="Description">
        <textarea className={inputCls} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Field label="Repository link" hint="Optional, e.g. https://github.com/you/project">
        <input className={inputCls} value={repoLink} onChange={(e) => setRepoLink(e.target.value)} />
      </Field>
      <div>
        <p className="mb-1 text-sm font-medium text-slate-700">Skills used</p>
        <div className="flex flex-wrap gap-2">
          {catalog.map((s) => {
            const on = selected.has(s.skill_id);
            return (
              <button
                key={s.skill_id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(s.skill_id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${on ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                {s.skill_name}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save project' : 'Add project'}</Button>
      </div>
    </form>
  );
}
