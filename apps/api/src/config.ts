import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET || 'nexus-super-secret-jwt-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  refreshTokenExpiresInDays: 90,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://nexus:nexuspass@localhost:5432/nexuspanel?schema=public',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  masterEncryptionKey: process.env.MASTER_ENCRYPTION_KEY || '12345678901234567890123456789012', // 32 bytes for AES-256
  isDev: process.env.NODE_ENV !== 'production',
};
