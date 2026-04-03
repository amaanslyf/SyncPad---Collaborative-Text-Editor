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
            <h1 className="auth-card__title">Create account</h1>
            <p className="auth-card__subtitle">Join SyncPad to start collaborating in real-time</p>

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
      </div>
    </Layout>
  );
}
