import { createClient } from 'redis';
import { config } from '../config';
import { logger } from './logger';

export const redisClient = createClient({
  url: config.redis.url,
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error', { error: err.message, stack: err.stack });
});

redisClient.on('connect', () => {
  logger.info('Redis Client Connected');
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    logger.info('Redis connected successfully');
  } catch (error: any) {
    logger.error('Failed to connect to Redis', { 
      error: error?.message || String(error),
      stack: error?.stack 
    });
    throw error;
  }
};

export const redisPublisher = createClient({
  url: config.redis.url,
});

export const redisSubscriber = createClient({
  url: config.redis.url,
});

export const connectRedisPubSub = async () => {
  try {
    await redisPublisher.connect();
    await redisSubscriber.connect();
    logger.info('Redis Pub/Sub connected successfully');
  } catch (error: any) {
    logger.error('Failed to connect to Redis Pub/Sub', { 
      error: error?.message || String(error),
      stack: error?.stack 
    });
    throw error;
  }
};
