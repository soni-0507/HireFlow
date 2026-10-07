import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth.js';
import { ErrorBanner, Field, Spinner } from '../components/ui.jsx';

export const AuthShell = ({ title, subtitle, children }) => (
  <div className="flex min-h-screen items-center justify-center px-4 py-10">
    <div className="w-full max-w-md">
      <p className="font-display text-2xl font-bold">Hiring Pipeline</p>
      <h1 className="mt-6 text-3xl font-bold">{title}</h1>
      <p className="muted mt-1 mb-6">{subtitle}</p>
      <div className="card p-6">{children}</div>
    </div>
  </div>
);

const DEMOS = [
  { label: 'Recruiter demo', email: 'recruiter@demo.com' },
  { label: 'Interviewer demo', email: 'interviewer@demo.com' },
];

export default function Login() {
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Log in" subtitle="Pick up where your hiring pipeline left off.">
      <form onSubmit={submit} className="space-y-4">
        <ErrorBanner message={error} />
        <Field label="Email">
          <input className="input" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password">
          <input className="input" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <button className="btn-primary w-full" disabled={loading}>
          {loading && <Spinner className="h-4 w-4 !text-white" />} Log in
        </button>
      </form>
      <div className="mt-5 border-t border-stone-200 pt-4 dark:border-stone-800">
        <p className="muted mb-2 text-xs">Seeded demo accounts (password: Password123)</p>
        <div className="flex flex-wrap gap-2">
          {DEMOS.map((d) => (
            <button key={d.email} type="button" className="btn-secondary btn-sm" onClick={() => setForm({ email: d.email, password: 'Password123' })}>
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <p className="muted mt-5 text-center">
        New here? <Link to="/signup" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">Create an account</Link>
      </p>
    </AuthShell>
  );
}
