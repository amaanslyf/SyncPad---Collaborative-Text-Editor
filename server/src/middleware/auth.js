import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('Auth');

/**
 * Express middleware: Verify JWT token from Authorization header
 */
export const authenticate = async (req, res, next) => {
  try {
    let token;

    // Extract token from "Bearer <token>" header
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      log.warn(`Unauthenticated request: ${req.method} ${req.originalUrl}`);
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request (without password)
    const user = await User.findById(decoded.id);
    if (!user) {
      log.warn(`Token references non-existent user: ${decoded.id}`);
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists',
      });
    }

    req.user = {
      id: user._id.toString(),
      displayName: user.displayName,
      email: user.email,
      color: user.color,
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      log.warn('Invalid JWT token presented');
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please log in again.',
      });
    }
    if (error.name === 'TokenExpiredError') {
      log.warn('Expired JWT token presented');
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please log in again.',
      });
    }
    log.error('Auth middleware unexpected error:', error);
    next(error);
  }
};

/**
 * Verify JWT for WebSocket upgrade requests
 * Returns user data or null
 */
export const authenticateWS = async (token) => {
  try {
    if (!token) {
      log.warn('WebSocket upgrade attempted without token');
      return null;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      log.warn(`WebSocket token references non-existent user: ${decoded.id}`);
      return null;
    }

    log.debug(`WebSocket auth successful for user: ${user.displayName}`);
    return {
      id: user._id.toString(),
      displayName: user.displayName,
      email: user.email,
      color: user.color,
    };
  } catch (error) {
    log.warn('WebSocket authentication failed:', { message: error.message, name: error.name });
    return null;
  }
};
