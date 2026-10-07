import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useFetch } from '../lib/useFetch.js';
import { STAGES, STAGE_STYLES } from '../lib/constants.js';
import { toast } from '../store/toast.js';
import { ErrorBanner, PageHeader, PageLoader } from '../components/ui.jsx';
import { useEffect } from 'react';

export default function Pipeline() {
  const { data, loading, error, reload } = useFetch(() => api.get('/candidates', { limit: 200, sort: 'name' }), []);
  const [items, setItems] = useState([]);
  const [dragId, setDragId] = useState(null);
  const [overStage, setOverStage] = useState(null);

  useEffect(() => {
    if (data) setItems(data.data);
  }, [data]);

  async function move(id, stage) {
    const current = items.find((c) => c._id === id);
    if (!current || current.stage === stage) return;
    const snapshot = items;
    setItems(items.map((c) => (c._id === id ? { ...c, stage } : c))); // optimistic
    try {
      await api.patch(`/candidates/${id}/stage`, { stage });
      toast.success(`${current.name} moved to ${stage}`);
    } catch (err) {
      setItems(snapshot); // roll back
      toast.error(err.message);
    }
  }

  if (loading && !data) return <PageLoader />;

  return (
    <>
      <PageHeader title="Pipeline board" subtitle="Drag a card to another column to change its stage. On touch screens, use the stage menu on each card." />
      <ErrorBanner message={error} onRetry={reload} />
      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8">
        <div className="flex min-w-max gap-4">
          {STAGES.map((stage) => {
            const cards = items.filter((c) => c.stage === stage);
            return (
              <section
                key={stage}
                aria-label={stage}
                onDragOver={(e) => { e.preventDefault(); setOverStage(stage); }}
                onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
                onDrop={(e) => {
                  e.preventDefault();
                  setOverStage(null);
                  move(e.dataTransfer.getData('text/plain') || dragId, stage);
                  setDragId(null);
                }}
                className={`flex max-h-[70vh] w-64 shrink-0 flex-col rounded-lg border-t-4 bg-stone-100/70 dark:bg-stone-900/60 ${STAGE_STYLES[stage].rail} ${overStage === stage ? 'ring-2 ring-brand-500' : ''}`}
              >
                <header className="flex items-center justify-between px-3 py-2.5">
                  <h2 className="font-sans text-sm font-bold">{stage}</h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold dark:bg-stone-800">{cards.length}</span>
                </header>
                <div className="space-y-2 overflow-y-auto px-2 pb-2">
                  {cards.length === 0 && <p className="muted px-1 py-4 text-center text-xs">Drop a candidate here</p>}
                  {cards.map((c) => (
                    <article
                      key={c._id}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', c._id); e.dataTransfer.effectAllowed = 'move'; setDragId(c._id); }}
                      onDragEnd={() => { setDragId(null); setOverStage(null); }}
                      className={`card cursor-grab p-3 active:cursor-grabbing ${dragId === c._id ? 'opacity-40' : ''}`}
                    >
                      <Link to={`/candidates/${c._id}`} className="block text-sm font-semibold hover:underline">{c.name}</Link>
                      <p className="muted truncate text-xs">{c.position}</p>
                      <p className="muted mt-1 text-xs">{c.experienceYears} yrs · {c.skills.slice(0, 2).join(', ')}</p>
                      <select
                        aria-label={`Change stage for ${c.name}`}
                        className="input mt-2 py-1 text-xs"
                        value={c.stage}
                        onChange={(e) => move(c._id, e.target.value)}
                      >
                        {STAGES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
