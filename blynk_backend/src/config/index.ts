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
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // origin이 없으면 (같은 origin 요청) 허용
      if (!origin) {
        callback(null, true);
        return;
      }

      const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || [
        'http://localhost:5173',
        'http://localhost:3000',
      ];

      // 허용된 origin 목록에 있으면 허용
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      // 운영 도메인 서브도메인 허용
      if (origin === 'https://qoodle.top' || origin.endsWith('.qoodle.top')) {
        callback(null, true);
        return;
      }

      // 와일드카드 패턴 허용 (예: https://*.qoodle.top)
      const matchesWildcardOrigin = allowedOrigins.some((allowed) => {
        if (!allowed.includes('*')) return false;
        const escaped = allowed.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace('\\*', '[^.]+');
        const regex = new RegExp(`^${escaped}$`);
        return regex.test(origin);
      });

      if (matchesWildcardOrigin) {
        callback(null, true);
        return;
      }

      // 로컬 서브도메인 허용 (포트 유무 모두 허용)
      const isLocalhostSubdomain = (
        /^https?:\/\/[^.]+\.localhost(?::\d+)?$/.test(origin) ||
        /^https?:\/\/.*\.localhost(?::\d+)?$/.test(origin)
      );

      // 로컬 루트 호스트 허용 (프록시 환경)
      const isLocalhostRoot = /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin);

      if (isLocalhostSubdomain || isLocalhostRoot) {
        callback(null, true);
      } else {
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    credentials: true,
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

  // Web Push (VAPID)
  webPush: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: process.env.VAPID_SUBJECT || 'mailto:support@qoodle.top',
  },
};
