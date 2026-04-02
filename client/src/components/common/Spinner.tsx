import './common.css';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return <span className={`spinner spinner--${size} ${className}`.trim()} role="status" aria-label="Loading" />;
}

interface FullPageSpinnerProps {
  message?: string;
}

export function FullPageSpinner({ message = 'Loading...' }: FullPageSpinnerProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 'var(--spacing-4)',
      }}
    >
      <Spinner size="lg" />
      <span style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--font-size-md)' }}>
        {message}
      </span>
    </div>
  );
}
