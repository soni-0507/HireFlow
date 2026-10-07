import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useFetch } from '../lib/useFetch.js';
import { useAuth } from '../store/auth.js';
import { STAGE_STYLES, INTERVIEW_TYPES, labelOf } from '../lib/constants.js';
import { fmtDateTime, timeAgo } from '../lib/format.js';
import { EmptyState, ErrorBanner, PageHeader, PageLoader, StageBadge } from '../components/ui.jsx';

const Stat = ({ label, value, hint }) => (
  <div className="card p-4">
    <p className="muted">{label}</p>
    <p className="mt-1 font-display text-3xl font-bold">{value}</p>
    {hint && <p className="muted mt-0.5 text-xs">{hint}</p>}
  </div>
);

function StageChart({ stageCounts }) {
  const max = Math.max(1, ...stageCounts.map((s) => s.count));
  const total = stageCounts.reduce((a, s) => a + s.count, 0);
  return (
    <div className="card p-5">
      <h2 className="text-lg font-bold">Candidates by stage</h2>
      <div className="mt-4 space-y-3">
        {stageCounts.map(({ stage, count }) => (
          <div key={stage} className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-3 text-sm">
            <span className="truncate">{stage}</span>
            <div className="h-2.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
              <div className={`h-full rounded-full ${STAGE_STYLES[stage].bar}`} style={{ width: `${(count / max) * 100}%` }} />
            </div>
            <span className="text-right font-semibold tabular-nums">{count}</span>
          </div>
        ))}
      </div>
      {total === 0 && <p className="muted mt-4">No candidates yet.</p>}
    </div>
  );
}

function Upcoming({ items }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between px-5 pt-5">
        <h2 className="text-lg font-bold">Upcoming interviews</h2>
        <Link to="/interviews" className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">View all</Link>
      </div>
      {items.length === 0 ? (
        <EmptyState title="Nothing scheduled" hint="Upcoming interviews will show up here." />
      ) : (
        <ul className="mt-2 divide-y divide-stone-100 dark:divide-stone-800">
          {items.map((i) => (
            <li key={i._id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <Link to={`/candidates/${i.candidate._id}`} className="block truncate font-semibold hover:underline">{i.candidate.name}</Link>
                <p className="muted truncate">{labelOf(INTERVIEW_TYPES, i.type)} · with {i.interviewer.name}</p>
              </div>
              <p className="shrink-0 text-right text-sm font-medium">{fmtDateTime(i.scheduledAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Dashboard() {
  const user = useAuth((s) => s.user);
  const { data, loading, error, reload } = useFetch(() => api.get('/dashboard'), []);

  if (loading) return <PageLoader />;
  if (error) return <ErrorBanner message={error} onRetry={reload} />;
  const d = data.data;
  const isRecruiter = d.role === 'recruiter';

  return (
    <>
      <PageHeader
        title={`Hello, ${user.name.split(' ')[0]}`}
        subtitle={isRecruiter ? 'Here is where your hiring pipeline stands today.' : 'Your assigned candidates and interviews.'}
        actions={isRecruiter && <Link to="/pipeline" className="btn-primary">Open pipeline board</Link>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={isRecruiter ? 'Total candidates' : 'Assigned candidates'} value={d.totals.candidates} />
        <Stat label="In progress" value={d.totals.inProgress} />
        {isRecruiter ? (
          <>
            <Stat label="Hired" value={d.totals.hired} />
            <Stat label="Rejected" value={d.totals.rejected} />
          </>
        ) : (
          <>
            <Stat label="Feedback pending" value={d.interviewerStats.pendingFeedback} hint="Past interviews without feedback" />
            <Stat label="Feedback submitted" value={d.interviewerStats.feedbackSubmitted} />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <StageChart stageCounts={d.stageCounts} />
        <Upcoming items={d.upcomingInterviews} />
      </div>

      {isRecruiter && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="card overflow-hidden">
            <h2 className="px-5 pt-5 text-lg font-bold">Recruiter activity, last 30 days</h2>
            {d.activitySummary.length === 0 ? (
              <EmptyState title="No activity yet" />
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-stone-100 dark:border-stone-800">
                      <th className="th">Recruiter</th>
                      <th className="th">Added</th>
                      <th className="th">Moves</th>
                      <th className="th">Interviews</th>
                      <th className="th">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.activitySummary.map((r) => (
                      <tr key={r.userId} className="border-b border-stone-100 last:border-0 dark:border-stone-800">
                        <td className="td font-semibold">{r.name}</td>
                        <td className="td tabular-nums">{r.candidatesAdded}</td>
                        <td className="td tabular-nums">{r.stageChanges}</td>
                        <td className="td tabular-nums">{r.interviewsScheduled}</td>
                        <td className="td tabular-nums">{r.notesAdded}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="card">
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 className="text-lg font-bold">Recent activity</h2>
              <Link to="/activity" className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">Full log</Link>
            </div>
            <ul className="mt-2 divide-y divide-stone-100 dark:divide-stone-800">
              {d.recentActivity.map((a) => (
                <li key={a._id} className="px-5 py-3 text-sm">
                  <p>{a.message}</p>
                  <p className="muted text-xs">{timeAgo(a.createdAt)}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
