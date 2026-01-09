import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import authRoutes from './routes/authRoutes';
import customerRoutes from './routes/customerRoutes';
import staffRoutes from './routes/staffRoutes';
import adminRoutes from './routes/adminRoutes';
import sseRoutes from './routes/sseRoutes';
import publicRoutes from './routes/publicRoutes';
import { connectRedis, connectRedisPubSub } from './utils/redis';

// Load environment variables
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const app = express();

// Middleware
app.use(cors({
  origin: config.cors.origin,
  credentials: true
}));
// Increase body size limit for Base64 image uploads (10MB)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(passport.initialize());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/public', publicRoutes); // Public routes (no authentication)
app.use('/api/auth', authRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sse', sseRoutes);

// Error handling
app.use(errorHandler);

const PORT = config.port || 3000;

// Initialize Redis connections
const startServer = async () => {
  try {
    await connectRedis();
    await connectRedisPubSub();
    
    app.listen(PORT, () => {
      logger.info(`🚀 Blynk Backend Server running on port ${PORT}`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error: any) {
    logger.error('Failed to start server', { 
      error: error?.message || String(error),
      stack: error?.stack 
    });
    process.exit(1);
  }
};

startServer();

export default app;
