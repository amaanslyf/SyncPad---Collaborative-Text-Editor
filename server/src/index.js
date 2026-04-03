import config from './config/config.js';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

import connectDB from './config/db.js';
import { initPersistence } from './services/persistence.js';
import { setupWebSocket, flushAllDocuments } from './services/websocket/index.js';
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
  origin: config.corsOrigin,
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
const start = async () => {
  try {
    log.info('Starting SyncPad server...');

    // Connect to MongoDB
    await connectDB();

    // Initialize Yjs persistence
    initPersistence(config.mongodbUri);

    // Setup WebSocket server for Yjs sync
    setupWebSocket(server);

    // Start HTTP + WS server
    server.listen(config.port, () => {
      log.info(`
╔══════════════════════════════════════════╗
║       🚀 SyncPad Server Running         ║
║──────────────────────────────────────────║
║  HTTP:  http://localhost:${config.port}            ║
║  WS:    ws://localhost:${config.port}/ws/:docId    ║
║  Mode:  ${config.nodeEnv.padEnd(28)}║
║  CORS:  ${config.corsOrigin.padEnd(28)}║
╚══════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    log.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled rejections and uncaught exceptions
process.on('unhandledRejection', (reason) => {
  log.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
const shutdown = async (signal) => {
  log.info(`${signal} received — shutting down gracefully`);
  
  try {
    // 1. Stop accepting new connections
    const closeServer = () => new Promise((resolve) => {
      server.close(() => {
        log.info('HTTP server closed');
        resolve();
      });
    });

    await closeServer();

    // 2. Flush all Yjs documents to MongoDB
    await flushAllDocuments();
    
    log.info('Graceful shutdown complete');
    process.exit(0);
  } catch (err) {
    log.error('Error during graceful shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();

export default app;

