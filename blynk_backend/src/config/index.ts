import dotenv from 'dotenv';

// Load .env file first (base configuration)
dotenv.config();

// Then load environment-specific file to override (e.g., .env.development)
const nodeEnv = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${nodeEnv}`, override: true });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://blynk:blynk@localhost:5433/blynk_db',
  },
  
  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  
  // Google OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
  },
  
  // Frontend URLs
  // All apps are served from a single port with path-based routing
  frontend: {
    baseUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:5173',
    adminUrl: `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/admin`,
    shopUrl: `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/shop`,
    customerUrl: `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/customer`,
  },
  
  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',').map(origin => origin.trim()) || ['http://localhost:5173'],
  },
  
  // File upload
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE || '5242880', 10), // 5MB
    allowedTypes: process.env.UPLOAD_ALLOWED_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/webp'],
  },
  
  // VietQR
  vietqr: {
    clientId: process.env.VIETQR_CLIENT_ID || '',
    apiKey: process.env.VIETQR_API_KEY || '',
  },
};
