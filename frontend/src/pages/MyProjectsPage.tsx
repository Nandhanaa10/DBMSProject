import { useCallback, useEffect, useState } from 'react';
import { errMsg } from '../api/client';
import { projectsApi } from '../api/projects';
import { skillsApi } from '../api/skills';
import ProjectForm from '../components/ProjectForm';
import { Alert, Button, Card, Spinner } from '../components/ui';
import type { Project, ProjectInput, Skill } from '../types/student';

export default function MyProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [catalog, setCatalog] = useState<Skill[]>([]);
  const [editing, setEditing] = useState<Project | 'new' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([projectsApi.list(), skillsApi.search('')]);
      setProjects(p); setCatalog(c); setError(null);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  async function save(input: ProjectInput) {
    if (editing && editing !== 'new') await projectsApi.update(editing.project_id, input);
    else await projectsApi.create(input);
    setEditing(null);
    await reload();
  }

  async function remove(p: Project) {
    if (!window.confirm(`Delete “${p.title}”? This cannot be undone.`)) return;
    try { await projectsApi.remove(p.project_id); await reload(); } catch (e) { setError(errMsg(e)); }
  }

  if (loading) return <Spinner label="Loading your projects…" />;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">My projects</h1>
        {editing === null && <Button onClick={() => setEditing('new')}>+ New project</Button>}
      </div>
      {error && <Alert>{error}</Alert>}

      {editing !== null && (
        <Card title={editing === 'new' ? 'New project' : 'Edit project'}>
          <ProjectForm
            key={editing === 'new' ? 'new' : editing.project_id}
            initial={editing === 'new' ? undefined : editing}
            catalog={catalog}
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        </Card>
      )}

      {projects.length === 0 && editing === null ? (
        <Card><p className="text-sm text-slate-500">No projects yet. Projects show recruiters what you can actually build.</p></Card>
      ) : (
        projects.map((p) => (
          <Card key={p.project_id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900">{p.title}</h2>
                {p.description && <p className="mt-1 text-sm text-slate-600">{p.description}</p>}
                {p.repo_link && (
                  <a href={p.repo_link} target="_blank" rel="noreferrer" className="mt-1 inline-block break-all text-sm text-indigo-600 hover:underline">
                    {p.repo_link}
                  </a>
                )}
                {p.skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.skills.map((s) => (
                      <span key={s.skill_id} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">{s.skill_name}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setEditing(p)}>Edit</Button>
                <Button variant="danger" onClick={() => void remove(p)}>Delete</Button>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
