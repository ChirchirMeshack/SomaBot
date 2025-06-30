// Load environment variables and validate before anything else
import dotenv from 'dotenv';
dotenv.config();

import logger from './utils/logger';
import pool from './utils/database';

if (!process.env.TWILIO_ACCOUNT_SID) {
  logger.error('Error: TWILIO_ACCOUNT_SID is required in your environment variables.');
  process.exit(1);
}

import express, { Request, Response } from 'express';

const app = express();
const PORT = 3000;

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

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info('Environment: development');
}); 