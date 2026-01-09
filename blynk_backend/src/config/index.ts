import dotenv from 'dotenv';

dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

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
  frontend: {
    baseUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:5173',
    adminUrl: process.env.FRONTEND_ADMIN_URL || 'http://localhost:5173/admin',
    shopUrl: process.env.FRONTEND_SHOP_URL || 'http://localhost:5173/shop',
    customerUrl: process.env.FRONTEND_CUSTOMER_URL || 'http://localhost:5173/customer',
  },
  
  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  },
  
  // File upload
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE || '5242880', 10), // 5MB
    allowedTypes: process.env.UPLOAD_ALLOWED_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/webp'],
  },
};
