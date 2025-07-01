import { createClient } from 'redis';
import logger from './logger';

const client = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

client.on('error', (err: Error) => {
  logger.error('Redis Client Error: ' + err.message);
});

client.on('connect', () => {
  logger.info('Redis Client Connected');
});

export default client; 