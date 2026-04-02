import { describe, it, expect, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import User from '../../src/models/User.js';

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    genSalt: vi.fn(),
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

describe('User Model', () => {


  describe('comparePassword instance method', () => {
    it('should return true if password matches', async () => {
      bcrypt.compare.mockResolvedValue(true);
      
      const user = new User({ password: 'hashedpassword' });
      const result = await user.comparePassword('plainpassword');

      expect(bcrypt.compare).toHaveBeenCalledWith('plainpassword', 'hashedpassword');
      expect(result).toBe(true);
    });

    it('should return false if password does not match', async () => {
      bcrypt.compare.mockResolvedValue(false);
      
      const user = new User({ password: 'hashedpassword' });
      const result = await user.comparePassword('wrongpassword');

      expect(result).toBe(false);
    });
  });

  describe('schema defaults', () => {
    it('should define color property correctly', () => {
      // Since we don't pass color, it should trigger the default function
      const colorDefaultFn = User.schema.path('color').defaultValue;
      expect(typeof colorDefaultFn).toBe('function');
      
      const defaultColor = colorDefaultFn();
      expect(defaultColor).toMatch(/^#[0-9A-Fa-f]{6}$/); // HSL derived color hex test
    });
  });
});
