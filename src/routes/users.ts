import { Router } from 'express';
import UserModel from '../models/User';
import UserActivityModel from '../models/UserActivity';
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

/**
 * Get user status by phone number
 */
router.get('/status/:phone', async (req, res) => {
  const { phone } = req.params;
  if (!phone) {
    return res.status(400).json({ status: 'error', message: 'Phone is required' });
  }
  try {
    const status = await UserModel.getStatus(phone);
    if (!status) {
      return res.status(404).json({ status: 'error', message: 'User not found or no status' });
    }
    res.json({ status: 'ok', userStatus: status });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get user status' });
  }
});

/**
 * Set user status by phone number
 * Expects { phone, status } in the request body
 */
router.post('/status', async (req, res) => {
  const { phone, status } = req.body;
  if (!phone || !status) {
    return res.status(400).json({ status: 'error', message: 'Phone and status are required' });
  }
  try {
    const user = await UserModel.setStatus(phone, status);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    res.json({ status: 'ok', message: 'User status updated', user });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to update user status' });
  }
});

/**
 * Search users by phone, name, status with pagination
 * Query params: phone, name, status, limit, offset
 */
router.get('/search', async (req, res) => {
  const { phone, name, status, limit, offset } = req.query;
  try {
    const users = await UserModel.searchUsers({
      phone: phone as string,
      name: name as string,
      status: status as string,
      limit: limit ? parseInt(limit as string, 10) : 10,
      offset: offset ? parseInt(offset as string, 10) : 0
    });
    res.json({ status: 'ok', users });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to search users' });
  }
});

/**
 * Log a user action
 * Expects { user_id, action, metadata } in the request body
 */
router.post('/activity', async (req, res) => {
  const { user_id, action, metadata } = req.body;
  if (!user_id || !action) {
    return res.status(400).json({ status: 'error', message: 'user_id and action are required' });
  }
  try {
    const log = await UserActivityModel.logAction(user_id, action, metadata);
    res.json({ status: 'ok', log });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to log activity' });
  }
});

/**
 * Get user actions by user_id and optional date range
 * Query params: from, to (ISO date strings)
 */
router.get('/activity/:user_id', async (req, res) => {
  const { user_id } = req.params;
  const { from, to } = req.query;
  if (!user_id) {
    return res.status(400).json({ status: 'error', message: 'user_id is required' });
  }
  try {
    const actions = await UserActivityModel.getActions(Number(user_id), from as string, to as string);
    res.json({ status: 'ok', actions });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get activity' });
  }
});

/**
 * Export all user data as JSON (GDPR compliance)
 */
router.get('/export/:phone', async (req, res) => {
  const { phone } = req.params;
  if (!phone) {
    return res.status(400).json({ status: 'error', message: 'Phone is required' });
  }
  try {
    const user = await UserModel.getUserByPhone(phone);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    const activity = user.id ? await UserActivityModel.getActions(user.id) : [];
    const exportData = {
      profile: user,
      activity
    };
    res.setHeader('Content-Disposition', `attachment; filename="user_${phone}_export.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(exportData, null, 2));
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to export user data' });
  }
});

export default router; 