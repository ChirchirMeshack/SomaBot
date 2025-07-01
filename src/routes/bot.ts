import { Router } from 'express';
import UserModel from '../models/User';
import logger from '../utils/logger';
import * as sessionService from '../services/sessionService';
import { formatMessage, sendMessage } from '../services/whatsappService';
import UserActivityModel from '../models/UserActivity';

const router = Router();

router.get('/ping', (req, res) => {
  res.json({ status: 'ok', domain: 'bot' });
});

/**
 * Register a user via WhatsApp (simulated)
 * Expects { phone: string } in the request body
 */
router.post('/register', async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ status: 'error', message: 'Phone number is required' });
  }
  try {
    // Check if user exists
    const existing = await UserModel.getUserByPhone(phone);
    if (existing) {
      return res.json({ status: 'ok', message: 'User already registered', user: existing });
    }
    // Create new user
    const user = await UserModel.createUser({ phone });
    // Send welcome/onboarding message (mock)
    const welcomeMsg = formatMessage(phone, "Welcome to SomaBot! Let's get you started.");
    await sendMessage(welcomeMsg);
    // Mark onboarding in preferences
    await UserModel.setPreferences(phone, { onboarding: 'started' });
    // Log onboarding event
    await UserActivityModel.logAction(user.id!, 'onboarding_started', {});
    res.json({ status: 'ok', message: 'User registered and onboarded', user });
  } catch (err) {
    logger.error('Registration error: ' + (err as Error).message);
    res.status(500).json({ status: 'error', message: 'Registration failed' });
  }
});

/**
 * Set user session data (for testing)
 * Expects { phone: string, data: object } in the request body
 */
router.post('/session', async (req, res) => {
  const { phone, data } = req.body;
  if (!phone || !data) {
    return res.status(400).json({ status: 'error', message: 'Phone and data are required' });
  }
  try {
    await sessionService.setSession(phone, data);
    res.json({ status: 'ok', message: 'Session set' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to set session' });
  }
});

/**
 * Get user session data (for testing)
 * Expects { phone: string } in the request body
 */
router.post('/session/get', async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ status: 'error', message: 'Phone is required' });
  }
  try {
    const session = await sessionService.getSession(phone);
    res.json({ status: 'ok', session });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get session' });
  }
});

export default router; 