import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { usePresence } from '../../src/hooks/usePresence';

// Mock the Auth hook
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { displayName: 'Current User', color: '#111111' },
  }),
}));

describe('usePresence', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockProvider: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockAwareness: any;

  beforeEach(() => {
    mockAwareness = {
      clientID: 123,
      setLocalStateField: vi.fn(),
      getStates: vi.fn().mockReturnValue(new Map()),
      on: vi.fn(),
      off: vi.fn(),
    };

    mockProvider = {
      awareness: mockAwareness,
    };
  });

  it('sets local awareness state on mount', () => {
    renderHook(() => usePresence(mockProvider));

    expect(mockAwareness.setLocalStateField).toHaveBeenCalledWith('user', {
      name: 'Current User',
      color: '#111111',
    });
  });

  it('tracks remote awareness states', () => {
    const states = new Map();
    // Current user (should be ignored in remote list)
    states.set(123, { user: { name: 'Current User' } });
    // Remote users
    states.set(456, { user: { name: 'Alice', color: '#red' }, cursor: { anchor: 1, head: 1 } });
    states.set(789, { user: { name: 'Bob', color: '#blue' } });

    mockAwareness.getStates.mockReturnValue(states);

    // Provide the underlying event callback
    let changeHandler: () => void = () => {};
    mockAwareness.on.mockImplementation((event: string, cb: () => void) => {
      if (event === 'change') changeHandler = cb;
    });

    const { result } = renderHook(() => usePresence(mockProvider));

    // Force an update
    React.act(() => {
      changeHandler();
    });

    // onlineCount should be remote users (2) + current user (1) = 3
    expect(result.current.onlineCount).toBe(3);
    
    // users should only contain remote users
    expect(result.current.users).toHaveLength(2);
    expect(result.current.users[0].name).toBe('Alice');
    expect(result.current.users[1].name).toBe('Bob');
  });

  it('returns safe defaults if provider is null', () => {
    const { result } = renderHook(() => usePresence(null));

    expect(result.current.users).toEqual([]);
    expect(result.current.onlineCount).toBe(1); // just the current user if disconnected
  });
});
