import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout/Layout';
import { Header } from '../components/Layout/Header';
import { Button } from '../components/common/Button';

export function NotFoundPage() {
  return (
    <Layout>
      <Header />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          gap: 'var(--spacing-4)',
          padding: 'var(--spacing-8)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '4rem', opacity: 0.3 }}>404</div>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>
          Page not found
        </h1>
        <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: 400 }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/">
          <Button variant="primary">Back to Home</Button>
        </Link>
      </div>
    </Layout>
  );
}
