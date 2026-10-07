import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useFetch } from '../lib/useFetch.js';
import { useAuth } from '../store/auth.js';
import { toast } from '../store/toast.js';
import { INTERVIEW_TYPES, STAGES, STAGE_STYLES, labelOf } from '../lib/constants.js';
import { fmtDate, fmtDateTime, timeAgo } from '../lib/format.js';
import CandidateForm from '../components/CandidateForm.jsx';
import InterviewForm from '../components/InterviewForm.jsx';
import { EmptyState, ErrorBanner, Modal, PageLoader, RecommendationBadge, Spinner, Stars, StageBadge } from '../components/ui.jsx';

export default function CandidateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const isRecruiter = user.role === 'recruiter';

  const cand = useFetch(() => api.get(`/candidates/${id}`), [id]);
  const interviews = useFetch(() => api.get('/interviews', { candidate: id, limit: 50 }), [id]);
  const feedback = useFetch(() => api.get('/feedback', { candidate: id, limit: 50 }), [id]);

  const [modal, setModal] = useState(null); // 'edit' | 'schedule'
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  if (cand.loading && !cand.data) return <PageLoader />;
  if (cand.error) {
    return (
      <div className="space-y-4">
        <ErrorBanner message={cand.error} onRetry={cand.reload} />
        <Link to="/candidates" className="btn-secondary">Back to candidates</Link>
      </div>
    );
  }
  const c = cand.data.data;

  async function changeStage(stage) {
    try {
      await api.patch(`/candidates/${id}/stage`, { stage });
      toast.success(`Moved to ${stage}`);
      cand.reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete ${c.name}? Their interviews and feedback will be deleted too.`)) return;
    try {
      await api.del(`/candidates/${id}`);
      toast.success('Candidate deleted');
      navigate('/candidates', { replace: true });
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function addNote(e) {
    e.preventDefault();
    if (!note.trim()) return;
    setBusy(true);
    try {
      await api.post(`/candidates/${id}/notes`, { text: note });
      setNote('');
      cand.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteNote(noteId) {
    try {
      await api.del(`/candidates/${id}/notes/${noteId}`);
      cand.reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const detail = (label, value) => (
    <div>
      <dt className="muted text-xs">{label}</dt>
      <dd className="text-sm font-medium">{value || '-'}</dd>
    </div>
  );

  return (
    <>
      <Link to="/candidates" className="muted hover:underline">&larr; All candidates</Link>

      <div className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{c.name}</h1>
          <p className="muted mt-1">{c.position}</p>
          <div className="mt-2"><StageBadge stage={c.stage} /></div>
        </div>
        {isRecruiter && (
          <div className="flex flex-wrap items-center gap-2">
            <select className="input w-auto" value={c.stage} onChange={(e) => changeStage(e.target.value)} aria-label="Change stage">
              {STAGES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <button className="btn-secondary" onClick={() => setModal('schedule')}>Schedule interview</button>
            <button className="btn-secondary" onClick={() => setModal('edit')}>Edit</button>
            <button className="btn-danger" onClick={remove}>Delete</button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* details */}
          <section className="card p-5">
            <h2 className="mb-4 text-lg font-bold">Details</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              {detail('Email', c.email)}
              {detail('Phone', c.phone)}
              {detail('Experience', `${c.experienceYears} years`)}
              {detail('Source', c.source)}
              {detail('Added', `${fmtDate(c.createdAt)}${c.createdBy ? ` by ${c.createdBy.name}` : ''}`)}
              <div>
                <dt className="muted text-xs">Resume</dt>
                <dd className="text-sm font-medium">
                  {c.resumeUrl ? <a href={c.resumeUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline dark:text-brand-400">Open resume</a> : '-'}
                </dd>
              </div>
            </dl>
            {c.skills.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {c.skills.map((s) => (
                  <span key={s} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium dark:bg-stone-800">{s}</span>
                ))}
              </div>
            )}
          </section>

          {/* interviews */}
          <section className="card">
            <h2 className="px-5 pt-5 text-lg font-bold">Interviews</h2>
            {interviews.loading && !interviews.data ? <PageLoader /> : interviews.error ? (
              <div className="p-5"><ErrorBanner message={interviews.error} onRetry={interviews.reload} /></div>
            ) : interviews.data.data.length === 0 ? (
              <EmptyState title="No interviews yet" hint={isRecruiter ? 'Schedule the first round for this candidate.' : undefined} />
            ) : (
              <ul className="mt-2 divide-y divide-stone-100 dark:divide-stone-800">
                {interviews.data.data.map((i) => (
                  <li key={i._id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                    <div>
                      <p className="font-semibold">{labelOf(INTERVIEW_TYPES, i.type)} interview</p>
                      <p className="muted">{fmtDateTime(i.scheduledAt)} · {i.interviewer.name}</p>
                    </div>
                    <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold capitalize dark:bg-stone-800">{i.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* feedback */}
          <section className="card">
            <h2 className="px-5 pt-5 text-lg font-bold">{isRecruiter ? 'Interviewer feedback' : 'Your feedback'}</h2>
            {feedback.loading && !feedback.data ? <PageLoader /> : feedback.error ? (
              <div className="p-5"><ErrorBanner message={feedback.error} onRetry={feedback.reload} /></div>
            ) : feedback.data.data.length === 0 ? (
              <EmptyState title="No feedback submitted yet" />
            ) : (
              <ul className="mt-2 divide-y divide-stone-100 dark:divide-stone-800">
                {feedback.data.data.map((f) => (
                  <li key={f._id} className="space-y-2 px-5 py-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{f.interviewer.name} <span className="muted font-normal">· {timeAgo(f.createdAt)}</span></p>
                      <div className="flex items-center gap-3"><Stars value={f.rating} /><RecommendationBadge value={f.recommendation} /></div>
                    </div>
                    {f.strengths && <p><span className="font-semibold">Strengths: </span>{f.strengths}</p>}
                    {f.concerns && <p><span className="font-semibold">Concerns: </span>{f.concerns}</p>}
                    {f.comments && <p className="muted">{f.comments}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          {/* notes */}
          <section className="card p-5">
            <h2 className="mb-3 text-lg font-bold">Notes</h2>
            <form onSubmit={addNote} className="mb-4">
              <textarea className="input" rows={3} placeholder="Add a note for the hiring team" value={note} onChange={(e) => setNote(e.target.value)} aria-label="New note" />
              <button className="btn-primary btn-sm mt-2" disabled={busy || !note.trim()}>
                {busy && <Spinner className="h-3 w-3 !text-white" />} Add note
              </button>
            </form>
            {c.notes.length === 0 ? (
              <p className="muted">No notes yet.</p>
            ) : (
              <ul className="space-y-3">
                {[...c.notes].reverse().map((n) => (
                  <li key={n._id} className="rounded-md bg-stone-50 p-3 text-sm dark:bg-stone-900">
                    <p>{n.text}</p>
                    <div className="muted mt-1.5 flex items-center justify-between text-xs">
                      <span>{n.authorName} ({n.role}) · {timeAgo(n.createdAt)}</span>
                      {(isRecruiter || n.author === user._id) && (
                        <button className="hover:text-rose-600 hover:underline" onClick={() => deleteNote(n._id)}>Delete</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* stage history */}
          <section className="card p-5">
            <h2 className="mb-3 text-lg font-bold">Stage history</h2>
            <ol className="space-y-3">
              {[...c.stageHistory].reverse().map((h, idx) => (
                <li key={idx} className="flex items-center gap-3 text-sm">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STAGE_STYLES[h.stage]?.bar}`} />
                  <span className="font-medium">{h.stage}</span>
                  <span className="muted ml-auto text-xs">{fmtDate(h.changedAt)}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      {modal === 'edit' && (
        <Modal title="Edit candidate" onClose={() => setModal(null)} wide>
          <CandidateForm candidate={c} onClose={() => setModal(null)} onSaved={() => { setModal(null); cand.reload(); }} />
        </Modal>
      )}
      {modal === 'schedule' && (
        <Modal title="Schedule interview" onClose={() => setModal(null)} wide>
          <InterviewForm candidate={c} onClose={() => setModal(null)} onSaved={() => { setModal(null); interviews.reload(); }} />
        </Modal>
      )}
    </>
  );
}
