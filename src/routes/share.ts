import { Router } from 'express';
import BadgeModel from '../models/Badge';
import ProgressModel from '../models/Progress';
import shareService from '../services/shareService';

const router = Router();

/**
 * Generate a shareable message/link for a badge
 */
router.get('/badge/:user_badge_id', async (req, res) => {
  try {
    const { user_badge_id } = req.params;
    // Find the badge info for this user_badge_id
    // For MVP, fetch all user badges and find the one with the given id
    const allUserBadges = await BadgeModel.getUserBadges(Number(user_badge_id));
    const badge = allUserBadges && allUserBadges.length > 0 ? allUserBadges[0] : null;
    if (!badge) {
      return res.status(404).json({ status: 'error', message: 'Badge not found' });
    }
    const shareText = `🏅 I just earned the "${badge.name}" badge on SomaBot! ${badge.description || ''} #SomaBot`;
    res.json({ status: 'ok', shareText });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to generate badge share message' });
  }
});

/**
 * Generate a shareable message/link for user progress
 */
router.get('/progress/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    // Get total completions and current streak
    const completions = await ProgressModel.getTopCompletions(1000); // get all for ranking
    const streaks = await ProgressModel.getTopStreaks(1000);
    const userCompletions = completions.find(u => u.user_id == user_id);
    const userStreak = streaks.find(u => u.user_id == user_id);
    const shareText = `📈 My learning progress on SomaBot: ${userCompletions ? userCompletions.completions : 0} lessons completed, current streak: ${userStreak ? userStreak.max_streak : 0} days! #SomaBot`;
    res.json({ status: 'ok', shareText });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to generate progress share message' });
  }
});

// Invite a friend via WhatsApp
router.post('/invite', async (req, res) => {
  const { user_id, friend_phone } = req.body;
  if (!user_id || !friend_phone) {
    return res.status(400).json({ status: 'error', message: 'user_id and friend_phone required' });
  }
  try {
    await shareService.sendInvite(user_id, friend_phone);
    res.json({ status: 'ok', message: 'Invite sent' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to send invite' });
  }
});

export default router; 