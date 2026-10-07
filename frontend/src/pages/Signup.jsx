import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth.js';
import { fieldErrors } from '../lib/api.js';
import { ErrorBanner, Field, Spinner } from '../components/ui.jsx';
import { AuthShell } from './Login.jsx';

const ROLE_OPTIONS = [
  { value: 'recruiter', title: 'Recruiter', text: 'Add candidates, move them through stages, schedule interviews.' },
  { value: 'interviewer', title: 'Interviewer', text: 'See your assigned candidates and submit feedback.' },
];

export default function Signup() {
  const signup = useAuth((s) => s.signup);
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'recruiter' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setErrors({});
    setLoading(true);
    try {
      await signup(form);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setErrors(fieldErrors(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Choose the role that matches how you hire.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <ErrorBanner message={error} />
        <Field label="Full name" error={errors.name}>
          <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Email" error={errors.email}>
          <input className="input" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password" hint="At least 8 characters, with a letter and a number" error={errors.password}>
          <input className="input" type="password" autoComplete="new-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <fieldset>
          <legend className="label">Role</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {ROLE_OPTIONS.map((r) => (
              <label key={r.value} className={`cursor-pointer rounded-md border p-3 text-sm ${form.role === r.value ? 'border-brand-500 bg-brand-50 dark:bg-brand-700/20' : 'border-stone-300 dark:border-stone-700'}`}>
                <input type="radio" name="role" className="sr-only" checked={form.role === r.value} onChange={() => setForm({ ...form, role: r.value })} />
                <span className="block font-semibold">{r.title}</span>
                <span className="muted mt-0.5 block text-xs">{r.text}</span>
              </label>
            ))}
          </div>
          {errors.role && <p className="mt-1 text-xs text-rose-600">{errors.role}</p>}
        </fieldset>
        <button className="btn-primary w-full" disabled={loading}>
          {loading && <Spinner className="h-4 w-4 !text-white" />} Create account
        </button>
      </form>
      <p className="muted mt-5 text-center">
        Already registered? <Link to="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">Log in</Link>
      </p>
    </AuthShell>
  );
}
