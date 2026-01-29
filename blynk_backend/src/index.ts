import express from 'express';
import cors from 'cors';
import passport from 'passport';
import path from 'path';
import { config } from './config'; // Environment variables are loaded in config/index.ts
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { resolveSubdomain } from './middleware/subdomainResolver';
import authRoutes from './routes/authRoutes';
import customerRoutes from './routes/customerRoutes';
import staffRoutes from './routes/staffRoutes';
import adminRoutes from './routes/adminRoutes';
import sseRoutes from './routes/sseRoutes';
import publicRoutes from './routes/publicRoutes';
import { connectRedis, connectRedisPubSub } from './utils/redis';

const app = express();

// Middleware
app.use(cors(config.cors));
// Increase body size limit for Base64 image uploads (10MB)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(passport.initialize());

// 서브도메인 리졸버 (라우트 등록 전에 실행, 모든 요청에 대해)
// 이 미들웨어는 req.restaurantId, req.restaurant, req.subdomain을 설정합니다
app.use(resolveSubdomain);

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

// Serve static files from frontend build (after API routes)
const publicPath = path.resolve(__dirname, '../public');
app.use(express.static(publicPath));

// SPA Fallback: All non-API routes should serve index.html for React Router
// Note: API routes are already handled above, so this will only match non-API routes
// Exclude /uploads paths from SPA fallback to allow static file serving
app.get('*', (req, res) => {
  // Skip SPA fallback for uploads and other static file paths - let express.static handle them
  if (req.path.startsWith('/uploads/') || req.path.startsWith('/assets/')) {
    res.status(404).json({ success: false, error: { message: 'File not found' } });
    return;
  }
  
  // Serve index.html for all non-API routes (React Router will handle client-side routing)
  const indexPath = path.resolve(publicPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      logger.error('Failed to serve index.html', { 
        error: err.message, 
        path: indexPath,
        publicPath,
        __dirname 
      });
      // If index.html doesn't exist, return 404
      res.status(404).json({ error: 'Frontend build not found' });
    }
  });
});

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
