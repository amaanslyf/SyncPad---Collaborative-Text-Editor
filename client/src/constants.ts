/**
 * SyncPad — Frontend Constants
 * 
 * Centralizes all non-styling configuration values.
 */

export const APP_CONFIG = {
  NAME: 'SyncPad',
  VERSION: '1.0.0',
  DESCRIPTION: 'Collaborative Real-time Text Editor',
};

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  WS_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws',
  TIMEOUT: 10000,
};

export const EDITOR_CONFIG = {
  TITLE_SYNC_DEBOUNCE: 1000,
  REVISION_LIMIT: 50,
  MAX_TITLE_LENGTH: 100,
};

export const AUTH_CONFIG = {
  TOKEN_KEY: 'syncpad_token',
  USER_KEY: 'syncpad_user',
};

export const LAYOUT_CONFIG = {
  SIDEBAR_WIDTH: 320,
  MOBILE_BREAKPOINT: 768,
};
