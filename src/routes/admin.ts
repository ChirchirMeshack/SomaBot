import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateJWT } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Hardcoded admin credentials for MVP
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'password123';

/**
 * Admin login endpoint
 * Expects { username, password } in the request body
 * Returns JWT if credentials are valid
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
    return res.json({ status: 'ok', token });
  }
  res.status(401).json({ status: 'error', message: 'Invalid credentials' });
});

/**
 * Protected admin route example
 * Requires valid JWT
 */
router.get('/protected', authenticateJWT, (req, res) => {
  res.json({ status: 'ok', message: 'You have access to protected admin data.' });
});

router.get('/ping', (req, res) => {
  res.json({ status: 'ok', domain: 'admin' });
});

export default router; 