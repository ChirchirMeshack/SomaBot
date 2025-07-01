import { Router } from 'express';
import BadgeModel from '../models/Badge';
import UserModel from '../models/User';
import { formatMessage, sendMessage } from '../services/whatsappService';

const router = Router();

/**
 * Create a new badge
 * Expects { name, description, icon_url, criteria } in the request body
 */
router.post('/', async (req, res) => {
  try {
    const badge = await BadgeModel.createBadge(req.body);
    res.json({ status: 'ok', badge });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to create badge' });
  }
});

/**
 * Award a badge to a user
 * Expects { user_id, badge_id } in the request body
 */
router.post('/award', async (req, res) => {
  try {
    const { user_id, badge_id } = req.body;
    if (!user_id || !badge_id) {
      return res.status(400).json({ status: 'error', message: 'user_id and badge_id are required' });
    }
    const userBadge = await BadgeModel.awardBadge(user_id, badge_id);
    // Fetch user phone and badge details, then send WhatsApp notification
    const user = await UserModel.getUserById(user_id);
    const badges = await BadgeModel.getUserBadges(user_id);
    const badgeInfo = badges.find(b => b.badge_id === badge_id);
    if (user && user.phone && badgeInfo) {
      const body = `🎉 Congratulations! You've earned a new badge: ${badgeInfo.name}\n${badgeInfo.description || ''}`;
      const msg = formatMessage(user.phone, body);
      await sendMessage(msg);
    }
    res.json({ status: 'ok', userBadge });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to award badge' });
  }
});

/**
 * Get all badges for a user
 */
router.get('/user/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const badges = await BadgeModel.getUserBadges(Number(user_id));
    res.json({ status: 'ok', badges });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get user badges' });
  }
});

export default router; 