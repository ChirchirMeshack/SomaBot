// Load environment variables and validate before anything else
import dotenv from 'dotenv';
dotenv.config();

import logger from './utils/logger';
import pool from './utils/database';
import client from './utils/redis';
import errorHandler from './middleware/errorHandler';
import { validatePhone ,handleValidationErrors } from './middleware/validation';
import botRouter from './routes/bot';
import adminRouter from './routes/admin';
import usersRouter from './routes/users';
import lessonsRouter from './routes/lessons';
import limiter from './middleware/rateLimiter';
import quizzesRouter from './routes/quizzes';
import coursesRouter from './routes/courses';

if (!process.env.TWILIO_ACCOUNT_SID) {
  logger.error('Error: TWILIO_ACCOUNT_SID is required in your environment variables.');
  process.exit(1);
}

import express, { Request, Response } from 'express';

const app = express();
app.use(express.json());
const PORT = 3000;

logger.error('Logger test: This should appear in both console and logs/app.log');

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/db-status', async (req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    logger.error('Database connection failed: ' + (err as Error).message);
    res.status(500).json({ status: 'error', error: 'Database connection failed' });
  }
});

app.get('/redis-status', async (req: Request, res: Response) => {
  try {
    await client.connect();
    await client.set('test', 'redis-connection-test');
    const testValue = await client.get('test');
    await client.disconnect();
    res.json({ status: 'ok', testValue });
  } catch (err) {
    logger.error('Redis connection failed: ' + (err as Error).message);
    res.status(500).json({ status: 'error', error: 'Redis connection failed' });
  }
});

app.post('/validate-phone', validatePhone, handleValidationErrors, (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'Phone number is valid' });
  });

app.get('/error-test', (req, res) => {
    throw new Error('This is a test error');
  });

app.use('/bot', botRouter);
app.use('/admin', adminRouter);
app.use('/users', usersRouter);
app.use('/courses', coursesRouter);
app.use('/lessons', lessonsRouter);
app.use('/quizzes', quizzesRouter);

app.use(limiter);

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info('Environment: development');
});

// Error handling middleware (should be after all routes)
app.use(errorHandler); 