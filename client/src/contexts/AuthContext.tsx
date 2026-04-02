import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { authApi, type AuthUser, ApiError } from '../services/api';
import { createLogger } from '../utils/logger';

const log = createLogger('Auth');

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (displayName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'syncpad_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Verify token / restore session on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        log.debug('No stored token found — user is unauthenticated');
        setIsLoading(false);
        return;
      }

      log.info('Restoring session from stored token...');
      try {
        const response = await authApi.getMe(token);
        if (response.data?.user) {
          setUser(response.data.user);
          log.info(`Session restored for: ${response.data.user.displayName}`);
        }
      } catch (err) {
        log.warn('Stored token is invalid — clearing session', err);
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    log.info(`Login attempt for: ${email}`);
    try {
      const response = await authApi.login({ email, password });
      if (response.data) {
        setUser(response.data.user);
        setToken(response.data.token);
        localStorage.setItem(TOKEN_KEY, response.data.token);
        log.info(`Login successful: ${response.data.user.displayName}`);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Login failed. Please try again.';
      log.error(`Login failed for ${email}:`, message);
      setError(message);
      throw err;
    }
  }, []);

  const register = useCallback(async (displayName: string, email: string, password: string) => {
    setError(null);
    log.info(`Registration attempt: ${displayName} (${email})`);
    try {
      const response = await authApi.register({ displayName, email, password });
      if (response.data) {
        setUser(response.data.user);
        setToken(response.data.token);
        localStorage.setItem(TOKEN_KEY, response.data.token);
        log.info(`Registration successful: ${response.data.user.displayName}`);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Registration failed. Please try again.';
      log.error(`Registration failed for ${email}:`, message);
      setError(message);
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    log.info(`User logged out: ${user?.displayName || 'unknown'}`);
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        logout,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
