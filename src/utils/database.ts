import { Pool } from 'pg';
import logger from './logger';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err: Error) => {
  logger.error('Unexpected error on idle PostgreSQL client: ' + err.message);
});

export default pool;  