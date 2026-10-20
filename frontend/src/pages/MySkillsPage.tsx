import { useCallback, useEffect, useMemo, useState } from 'react';
import { errMsg } from '../api/client';
import { recommendationsApi } from '../api/recommendations';
import { skillsApi } from '../api/skills';
import { Alert, Button, Card, Spinner, inputCls } from '../components/ui';
import { PROFICIENCIES, type Proficiency, type Skill, type SkillGapItem, type StudentSkill } from '../types/student';

const levelTone: Record<Proficiency, string> = {
  beginner: 'bg-amber-50 text-amber-700',
  intermediate: 'bg-sky-50 text-sky-700',
  advanced: 'bg-emerald-50 text-emerald-700',
};

export default function MySkillsPage() {
  const [mine, setMine] = useState<StudentSkill[]>([]);
  const [gaps, setGaps] = useState<SkillGapItem[]>([]);
  const [results, setResults] = useState<Skill[]>([]);
  const [q, setQ] = useState('');
  const [newLevel, setNewLevel] = useState<Proficiency>('beginner');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [m, g] = await Promise.all([skillsApi.mine(), recommendationsApi.skillGap()]);
      setMine(m); setGaps(g); setError(null);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  useEffect(() => {          // debounced catalog search
    const t = setTimeout(() => {
      skillsApi.search(q).then(setResults).catch((e) => setError(errMsg(e)));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const ownedIds = useMemo(() => new Set(mine.map((s) => s.skill_id)), [mine]);
  const candidates = results.filter((s) => !ownedIds.has(s.skill_id)).slice(0, 8);

  async function add(skillId: number, level: Proficiency) {
    try { await skillsApi.add(skillId, level); await reload(); } catch (e) { setError(errMsg(e)); }
  }
  async function changeLevel(skillId: number, level: Proficiency) {
    try {
      await skillsApi.update(skillId, level);
      setMine((prev) => prev.map((s) => (s.skill_id === skillId ? { ...s, proficiency: level } : s)));
    } catch (e) { setError(errMsg(e)); }
  }
  async function remove(skillId: number) {
    try { await skillsApi.remove(skillId); await reload(); } catch (e) { setError(errMsg(e)); }
  }

  if (loading) return <Spinner label="Loading your skills…" />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">My skills</h1>
      {error && <Alert>{error}</Alert>}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title={`Your skills (${mine.length})`}>
            {mine.length === 0 ? (
              <p className="text-sm text-slate-500">No skills yet. Search the catalog on the right to add your first one.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {mine.map((s) => (
                  <li key={s.skill_id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{s.skill_name}</p>
                      <p className="text-xs text-slate-500">{s.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        aria-label={`Proficiency for ${s.skill_name}`}
                        className={`rounded-full border-0 px-3 py-1 text-xs font-medium ${levelTone[s.proficiency]}`}
                        value={s.proficiency}
                        onChange={(e) => void changeLevel(s.skill_id, e.target.value as Proficiency)}
                      >
                        {PROFICIENCIES.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <Button variant="danger" onClick={() => void remove(s.skill_id)}>Remove</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Skill gap">
            <p className="mb-3 text-xs text-slate-500">Skills needed by opportunities you saved or applied to, that you don’t have yet.</p>
            {gaps.length === 0 ? (
              <p className="text-sm text-slate-500">No gaps right now. Save or apply to opportunities to get recommendations.</p>
            ) : (
              <ul className="space-y-2">
                {gaps.map((g) => (
                  <li key={g.skill_id} className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{g.skill_name}</p>
                      <p className="text-xs text-slate-500">needed by {g.needed_by_count} {g.needed_by_count === 1 ? 'opportunity' : 'opportunities'}</p>
                    </div>
                    <Button variant="secondary" onClick={() => void add(g.skill_id, 'beginner')}>+ Add</Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Add a skill">
            <div className="space-y-3">
              <input className={inputCls} placeholder="Search skills…" value={q} onChange={(e) => setQ(e.target.value)} />
              <select className={inputCls} value={newLevel} onChange={(e) => setNewLevel(e.target.value as Proficiency)} aria-label="Proficiency for new skill">
                {PROFICIENCIES.map((p) => <option key={p} value={p}>Add as {p}</option>)}
              </select>
              {candidates.length === 0 ? (
                <p className="text-sm text-slate-500">No matching skills to add.</p>
              ) : (
                <ul className="space-y-1">
                  {candidates.map((s) => (
                    <li key={s.skill_id} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50">
                      <span className="text-sm text-slate-800">{s.skill_name}</span>
                      <Button variant="secondary" onClick={() => void add(s.skill_id, newLevel)}>Add</Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
