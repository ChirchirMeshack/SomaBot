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

/**
 * Get AI conversation context for a user from Redis
 * @param phone - User phone number
 * @returns Array of message objects (OpenAI format)
 */
export async function getAIContext(phone: string): Promise<any[] | null> {
  await client.connect();
  const value = await client.get(`ai_context:${phone}`);
  await client.disconnect();
  return value ? JSON.parse(value) : null;
}

/**
 * Set AI conversation context for a user in Redis (limit to 10 messages)
 * @param phone - User phone number
 * @param contextArr - Array of message objects (OpenAI format)
 */
export async function setAIContext(phone: string, contextArr: any[]): Promise<void> {
  const limited = contextArr.slice(-10); // keep last 10
  await client.connect();
  await client.set(`ai_context:${phone}`, JSON.stringify(limited));
  await client.disconnect();
} 