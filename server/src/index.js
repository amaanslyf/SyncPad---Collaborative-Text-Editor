import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

import connectDB from './config/db.js';
import { initPersistence } from './services/persistence.js';
import { setupWebSocket } from './services/websocket.js';
import authRoutes from './routes/auth.js';
import documentRoutes from './routes/documents.js';
import errorHandler from './middleware/errorHandler.js';
import requestLogger from './middleware/logger.js';
import { createLogger } from './utils/logger.js';

const log = createLogger('Server');

const app = express();
const server = createServer(app);

// ─── Middleware ────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

// ─── Health Check ─────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'SyncPad API is running',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
  });
});

// ─── API Routes ───────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);

// ─── 404 Handler ──────────────────────────────────────────
app.use((req, res) => {
  log.warn(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// ─── Error Handler ────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────
const PORT = process.env.PORT || 3001;

const start = async () => {
  try {
    log.info('Starting SyncPad server...');

    // Validate required env vars
    if (!process.env.MONGODB_URI) {
      log.error('MONGODB_URI environment variable is not set');
      process.exit(1);
    }
    if (!process.env.JWT_SECRET) {
      log.error('JWT_SECRET environment variable is not set');
      process.exit(1);
    }

    // Connect to MongoDB
    await connectDB();

    // Initialize Yjs persistence
    initPersistence(process.env.MONGODB_URI);

    // Setup WebSocket server for Yjs sync
    setupWebSocket(server);

    // Start HTTP + WS server
    server.listen(PORT, () => {
      log.info(`
╔══════════════════════════════════════════╗
║       🚀 SyncPad Server Running         ║
║──────────────────────────────────────────║
║  HTTP:  http://localhost:${PORT}            ║
║  WS:    ws://localhost:${PORT}/ws/:docId    ║
║  Mode:  ${(process.env.NODE_ENV || 'development').padEnd(28)}║
║  CORS:  ${(process.env.CORS_ORIGIN || 'http://localhost:5173').padEnd(28)}║
╚══════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    log.error('Failed to start server:', {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

// Handle unhandled rejections and uncaught exceptions
process.on('unhandledRejection', (reason) => {
  log.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', { message: error.message, stack: error.stack });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log.info('SIGTERM received — shutting down gracefully');
  server.close(() => {
    log.info('Server closed');
    process.exit(0);
  });
});

start();

export default app;
