import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';
import { authApi } from '../../src/services/api';

// Create a consumer to test context values
const TestConsumer = () => {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="auth-status">{auth.isAuthenticated ? 'Logged In' : 'Logged Out'}</span>
      <span data-testid="user-name">{auth.user?.displayName || 'None'}</span>
      <button onClick={() => auth.login('test@test.com', 'password')}>Login</button>
      <button onClick={() => auth.logout()}>Logout</button>
      <span data-testid="error">{auth.error}</span>
    </div>
  );
};

vi.mock('../../src/services/api', () => ({
  authApi: {
    getMe: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(msg: string) { super(msg); }
  }
}));

describe('AuthContext', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it('restores user session from localStorage', async () => {
    localStorage.setItem('syncpad_token', 'valid-token');
    
    vi.mocked(authApi.getMe).mockResolvedValue({
      data: { user: { id: '1', displayName: 'Restored User', email: 'test@test.com', color: '#ff0' } },
      success: true,
      token: 'valid-token'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Initial state is still loading
    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('Logged In');
      expect(screen.getByTestId('user-name').textContent).toBe('Restored User');
    });
    
    expect(authApi.getMe).toHaveBeenCalledWith('valid-token');
  });

  it('clears session if localStorage token is invalid', async () => {
    localStorage.setItem('syncpad_token', 'invalid-token');
    
    vi.mocked(authApi.getMe).mockRejectedValue(new Error('Invalid token'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('Logged Out');
      expect(localStorage.getItem('syncpad_token')).toBeNull();
    });
  });

  it('handles login flow and stores token', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      data: {
        user: { id: '2', displayName: 'Logged In User', email: 'a@a.com', color: '#f00' },
        token: 'new-token'
      },
      success: true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    
    vi.mocked(authApi.getMe).mockResolvedValue({
      data: { user: { id: '2', displayName: 'Logged In User', email: 'a@a.com', color: '#f00' } },
      success: true,
      token: 'new-token'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Click trigger the async login fn
    await act(async () => {
      fireEvent.click(screen.getByText('Login'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('Logged In');
      expect(localStorage.getItem('syncpad_token')).toBe('new-token');
    });
  });

  it('handles logout flow', async () => {
    // Initial state setup to be logged in
    localStorage.setItem('syncpad_token', 'valid-token');
    vi.mocked(authApi.getMe).mockResolvedValue({
      data: { user: { id: '1', displayName: 'Restored User', email: 'test@t.com', color: '#ff0' } },
      success: true,
      token: 'valid-token'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('auth-status').textContent).toBe('Logged In'));

    await act(async () => {
      fireEvent.click(screen.getByText('Logout'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('Logged Out');
      expect(localStorage.getItem('syncpad_token')).toBeNull();
    });
  });
});
