import { Router } from 'express';
import UserModel from '../models/User';
const router = Router();

router.get('/ping', (req, res) => {
  res.json({ status: 'ok', domain: 'users' });
});

/**
 * Set user preferences
 * Expects { phone: string, preferences: object } in the request body
 */
router.post('/preferences', async (req, res) => {
  const { phone, preferences } = req.body;
  if (!phone || !preferences) {
    return res.status(400).json({ status: 'error', message: 'Phone and preferences are required' });
  }
  try {
    const user = await UserModel.setPreferences(phone, preferences);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    res.json({ status: 'ok', message: 'Preferences updated', user });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to update preferences' });
  }
});

/**
 * Get user preferences by phone number
 */
router.get('/preferences/:phone', async (req, res) => {
  const { phone } = req.params;
  if (!phone) {
    return res.status(400).json({ status: 'error', message: 'Phone is required' });
  }
  try {
    const preferences = await UserModel.getPreferences(phone);
    if (!preferences) {
      return res.status(404).json({ status: 'error', message: 'Preferences not found' });
    }
    res.json({ status: 'ok', preferences });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get preferences' });
  }
});

/**
 * Get user profile by phone number
 */
router.get('/profile/:phone', async (req, res) => {
  const { phone } = req.params;
  if (!phone) {
    return res.status(400).json({ status: 'error', message: 'Phone is required' });
  }
  try {
    const user = await UserModel.getUserByPhone(phone);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    res.json({ status: 'ok', user });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get user profile' });
  }
});

/**
 * Update user profile by phone number
 * Expects { name, subscription_tier, preferences } in the request body (all optional)
 */
router.put('/profile/:phone', async (req, res) => {
  const { phone } = req.params;
  const updates = req.body;
  if (!phone) {
    return res.status(400).json({ status: 'error', message: 'Phone is required' });
  }
  try {
    const user = await UserModel.updateUserByPhone(phone, updates);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    res.json({ status: 'ok', message: 'User profile updated', user });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to update user profile' });
  }
});

export default router; 