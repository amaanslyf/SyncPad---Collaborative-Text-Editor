import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout/Layout';
import { Button } from '../components/common/Button';
import '../components/common/common.css';

export function LoginPage() {
  const { login, error, clearError, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch {
      // Error is handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return null;

  return (
    <Layout>
      <div className="auth-page">
        <div className="login-watermark">SyncPad</div>
        
        <div className="login-hero">
          <div className="login-hero__logo">
            <img src="/assets/logo.png" alt="SyncPad Logo" className="login-hero__logo-img" />
            <span>SyncPad</span>
          </div>
          <h1 className="login-hero__title">
            The Ethereal Workspace.
          </h1>
          <div className="login-features">
            <div className="feature-item">
              <h3>Real-time Fluid Collaboration</h3>
              <p>Seamless, lag-free editing with your team in a responsive canvas.</p>
            </div>
            <div className="feature-item">
              <h3>Atmospheric Revision History</h3>
              <p>Travel through time to see every change and restore versions with depth.</p>
            </div>
            <div className="feature-item">
              <h3>Secure Ethereal Workspace</h3>
              <p>Your ideas are protected by enterprise-grade security and modern privacy.</p>
            </div>
          </div>
        </div>

        <div className="login-auth">
          <div className="auth-card glass">
            <div className="auth-card__logo">
              <img src="/assets/logo.png" alt="SyncPad Logo" className="auth-card__logo-img" />
            </div>
            <h1 className="auth-card__title">Welcome back</h1>
            <p className="auth-card__subtitle">Sign in to SyncPad to continue collaborating</p>

            {error && (
              <div className="auth-card__error animate-fade-in">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="input-group">
                <label className="input-label" htmlFor="login-email">Email</label>
                <input
                  id="login-email"
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
                <label className="input-label" htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  minLength={6}
                />
              </div>

              <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting}>
                Sign In
              </Button>
            </form>

            <p className="auth-card__footer">
              Don't have an account?{' '}
              <Link to="/register" className="auth-card__link">Create one</Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
