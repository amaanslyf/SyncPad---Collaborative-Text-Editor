import { createLogger } from '../utils/logger';

const log = createLogger('API');

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

/**
 * Centralized API client for all REST requests
 */
async function apiRequest<T = unknown>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  log.debug(`${method} ${endpoint}`);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      log.warn(`${method} ${endpoint} → ${response.status}:`, data.message);
      throw new ApiError(data.message || 'Something went wrong', response.status, data.errors);
    }

    log.debug(`${method} ${endpoint} → ${response.status} OK`);
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error; // Re-throw API errors as-is
    }
    // Network error or JSON parse failure
    log.error(`${method} ${endpoint} — Network error:`, error);
    throw new ApiError('Network error. Please check your connection.', 0);
  }
}

export class ApiError extends Error {
  status: number;
  errors?: string[];

  constructor(message: string, status: number, errors?: string[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

// ─── Auth API ─────────────────────────────────────────────
export interface AuthUser {
  id: string;
  displayName: string;
  email: string;
  color: string;
}

interface AuthResponse {
  user: AuthUser;
  token: string;
}

export const authApi = {
  register: (data: { displayName: string; email: string; password: string }) =>
    apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: data }),

  login: (data: { email: string; password: string }) =>
    apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: data }),

  getMe: (token: string) =>
    apiRequest<{ user: AuthUser }>('/auth/me', { token }),
};

// ─── Documents API ────────────────────────────────────────
export interface DocumentMeta {
  _id: string;
  id: string;
  title: string;
  owner: { _id: string; displayName: string; email: string; color: string };
  collaborators: { _id: string; displayName: string; color: string }[];
  lastEditedBy?: { displayName: string; color: string };
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RevisionMeta {
  id: string;
  label: string;
  createdByName: string;
  createdAt: string;
}

export const documentsApi = {
  list: (token: string) =>
    apiRequest<{ documents: DocumentMeta[] }>('/documents', { token }),

  create: (token: string, title?: string) =>
    apiRequest<{ document: DocumentMeta }>('/documents', {
      method: 'POST',
      body: { title },
      token,
    }),

  get: (token: string, id: string) =>
    apiRequest<{ document: DocumentMeta }>(`/documents/${id}`, { token }),

  update: (token: string, id: string, data: { title?: string }) =>
    apiRequest<{ document: DocumentMeta }>(`/documents/${id}`, {
      method: 'PATCH',
      body: data,
      token,
    }),

  delete: (token: string, id: string) =>
    apiRequest(`/documents/${id}`, { method: 'DELETE', token }),

  getRevisions: (token: string, id: string) =>
    apiRequest<{ revisions: RevisionMeta[] }>(`/documents/${id}/revisions`, { token }),

  createRevision: (token: string, id: string, data: { label?: string; snapshot: string }) =>
    apiRequest(`/documents/${id}/revisions`, {
      method: 'POST',
      body: data,
      token,
    }),

  getRevisionSnapshot: (token: string, docId: string, revisionId: string) =>
    apiRequest<{ snapshot: string; label: string; createdAt: string }>(
      `/documents/${docId}/revisions/${revisionId}`,
      { token }
    ),
};
