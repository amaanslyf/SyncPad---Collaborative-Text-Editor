import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('AuthController');

/**
 * Generate JWT token for a user
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * POST /api/auth/register
 * Create a new user account
 */
export const register = async (req, res, next) => {
  try {
    const { displayName, email, password } = req.body;

    log.info(`Registration attempt for email: ${email}`);

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      log.warn(`Registration rejected — duplicate email: ${email}`);
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // Create user
    const user = await User.create({ displayName, email, password });
    const token = generateToken(user._id);

    log.info(`User registered successfully: ${user.displayName} (${user.email})`);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          displayName: user.displayName,
          email: user.email,
          color: user.color,
        },
        token,
      },
    });
  } catch (error) {
    log.error('Registration error:', { message: error.message, stack: error.stack });
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Authenticate user and return token
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      log.warn('Login attempt with missing credentials');
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    log.info(`Login attempt for email: ${email}`);

    // Find user with password field included
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      log.warn(`Login failed — user not found: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      log.warn(`Login failed — wrong password for: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user._id);

    log.info(`User logged in: ${user.displayName} (${user.email})`);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          displayName: user.displayName,
          email: user.email,
          color: user.color,
        },
        token,
      },
    });
  } catch (error) {
    log.error('Login error:', { message: error.message, stack: error.stack });
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Get current user profile
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      log.warn(`getMe: User not found for id: ${req.user.id}`);
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    log.debug(`Profile fetched for: ${user.displayName}`);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          displayName: user.displayName,
          email: user.email,
          color: user.color,
        },
      },
    });
  } catch (error) {
    log.error('getMe error:', { message: error.message, stack: error.stack });
    next(error);
  }
};
