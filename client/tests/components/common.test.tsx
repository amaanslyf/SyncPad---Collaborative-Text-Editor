import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../../src/components/common/Button';
import { Avatar } from '../../src/components/common/Avatar';
import { Spinner } from '../../src/components/common/Spinner';

describe('Button', () => {
  it('renders with children text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('applies primary variant class by default', () => {
    render(<Button>Primary</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('btn--primary');
  });

  it('applies secondary variant class', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('btn--secondary');
  });

  it('is disabled when isLoading is true', () => {
    render(<Button isLoading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows spinner when loading', () => {
    render(<Button isLoading>Loading</Button>);
    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('Avatar', () => {
  it('renders initials from name', () => {
    render(<Avatar name="John Doe" color="#a8a4ff" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders single initial for single name', () => {
    render(<Avatar name="Alice" color="#ff9dd0" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('applies color as background', () => {
    render(<Avatar name="Bob" color="#00D68F" />);
    const avatar = screen.getByText('B');
    expect(avatar.style.backgroundColor).toBe('rgb(0, 214, 143)');
  });
});

describe('Spinner', () => {
  it('renders with correct size class', () => {
    const { container } = render(<Spinner size="lg" />);
    expect(container.querySelector('.spinner--lg')).toBeInTheDocument();
  });

  it('has loading role', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
