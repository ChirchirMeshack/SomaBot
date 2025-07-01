import { Router } from 'express';
import challengeService from '../services/challengeService';

const router = Router();

// User opts in to a challenge
router.post('/opt-in', async (req, res) => {
  const { user_id, challenge_id } = req.body;
  if (!user_id || !challenge_id) {
    return res.status(400).json({ status: 'error', message: 'user_id and challenge_id required' });
  }
  try {
    const result = await challengeService.optIn(user_id, challenge_id);
    res.json({ status: 'ok', participation: result });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to opt in' });
  }
});

// Get user challenge status
router.get('/status/:user_id', async (req, res) => {
  try {
    const status = await challengeService.getUserStatus(Number(req.params.user_id));
    res.json({ status: 'ok', challenges: status });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get status' });
  }
});

// Update challenge progress (e.g., after lesson completion)
router.post('/progress', async (req, res) => {
  const { user_id, challenge_id, increment } = req.body;
  if (!user_id || !challenge_id) {
    return res.status(400).json({ status: 'error', message: 'user_id and challenge_id required' });
  }
  try {
    const updated = await challengeService.updateProgress(user_id, challenge_id, increment || 1);
    res.json({ status: 'ok', updated });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to update progress' });
  }
});

export default router; 