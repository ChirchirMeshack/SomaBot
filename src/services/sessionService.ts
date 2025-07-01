import redisClient from '../utils/redis';

const SESSION_TTL = 60 * 60; // 1 hour in seconds

/**
 * Set user session data in Redis with TTL
 */
export async function setSession(phone: string, data: object) {
  await redisClient.connect();
  await redisClient.set(`user_session:${phone}`, JSON.stringify(data), {
    EX: SESSION_TTL
  });
  await redisClient.disconnect();
}

/**
 * Get user session data from Redis
 */
export async function getSession(phone: string): Promise<object | null> {
  await redisClient.connect();
  const value = await redisClient.get(`user_session:${phone}`);
  await redisClient.disconnect();
  return value ? JSON.parse(value) : null;
}

/**
 * Delete user session data from Redis
 */
export async function deleteSession(phone: string) {
  await redisClient.connect();
  await redisClient.del(`user_session:${phone}`);
  await redisClient.disconnect();
} 