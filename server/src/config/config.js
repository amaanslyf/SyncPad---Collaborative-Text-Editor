import 'dotenv/config';

/**
 * Server Configuration
 *
 * Centralizes all environment variables into a single, validated object.
 * This prevents direct `process.env` calls scattered throughout the codebase.
 */
const config = {
  // ─── Server ───────────────────────────────────────────────
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // ─── Database ─────────────────────────────────────────────
  mongodbUri: process.env.MONGODB_URI,

  // ─── Auth ─────────────────────────────────────────────────
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // ─── Security ─────────────────────────────────────────────
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // ─── WebSocket (Yjs) ──────────────────────────────────────
  ws: {
    idleTimeout: 30000, // 30s before destroying an empty room
    flushInterval: 2000, // 2s before flushing incremental updates to DB
  },

  // ─── Logging ──────────────────────────────────────────────
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
};

// Validate critical configuration
const requiredVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingVars = requiredVars.filter(v => !process.env[v]);

if (missingVars.length > 0) {
  console.error(`\n❌ ERROR: Missing required environment variables: ${missingVars.join(', ')}\n`);
  process.exit(1);
}

export default config;
