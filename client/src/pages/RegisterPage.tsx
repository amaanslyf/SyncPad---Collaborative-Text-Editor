import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout/Layout';
import { Button } from '../components/common/Button';
import '../components/common/common.css';

export function RegisterPage() {
  const { register, error, clearError, isLoading } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);
    try {
      await register(displayName, email, password);
    } catch {
      // Error handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return null;

  return (
    <Layout>
      <div className="auth-page">
        <div className="auth-card glass">
          <div className="auth-card__logo">
            <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
              <defs>
                <linearGradient id="auth-g2" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#a8a4ff" />
                  <stop offset="100%" stopColor="#675df9" />
                </linearGradient>
              </defs>
              <rect width="64" height="64" rx="14" fill="var(--color-surface-container)" />
              <path d="M18 16h28a2 2 0 012 2v28a2 2 0 01-2 2H18a2 2 0 01-2-2V18a2 2 0 012-2z" stroke="url(#auth-g2)" strokeWidth="2.5" fill="none" />
              <line x1="22" y1="24" x2="42" y2="24" stroke="url(#auth-g2)" strokeWidth="2" strokeLinecap="round" />
              <line x1="22" y1="30" x2="38" y2="30" stroke="url(#auth-g2)" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
              <line x1="22" y1="36" x2="34" y2="36" stroke="url(#auth-g2)" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
            </svg>
          </div>
          <h1 className="auth-card__title">Create your account</h1>
          <p className="auth-card__subtitle">Join SyncPad and start collaborating in real-time</p>

          {error && (
            <div className="auth-card__error animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label className="input-label" htmlFor="register-name">Display Name</label>
              <input
                id="register-name"
                className="input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                required
                minLength={2}
                maxLength={30}
                autoComplete="name"
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="register-email">Email</label>
              <input
                id="register-email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="register-password">Password</label>
              <input
                id="register-password"
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                minLength={6}
              />
            </div>

            <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting}>
              Create Account
            </Button>
          </form>

          <p className="auth-card__footer">
            Already have an account?{' '}
            <Link to="/login" className="auth-card__link">Sign in</Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}
