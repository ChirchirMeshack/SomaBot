import { Router } from 'express';
import progressAnalyticsService from '../services/progressAnalyticsService';
import recommendationService from '../services/recommendationService';

const router = Router();

// Progress patterns: completions per day, active hours
router.get('/progress/patterns', async (req, res) => {
  try {
    const perDay = await progressAnalyticsService.completionsPerDay();
    const hours = await progressAnalyticsService.activeHours();
    res.json({ status: 'ok', perDay, hours });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get progress patterns' });
  }
});

// Retention rates
router.get('/progress/retention', async (req, res) => {
  try {
    const retention = await progressAnalyticsService.retentionRates();
    res.json({ status: 'ok', retention });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get retention rates' });
  }
});

router.get('/recommendation/:user_id', async (req, res) => {
  try {
    const rec = await recommendationService.getNextRecommendation(Number(req.params.user_id));
    res.json({ status: 'ok', recommendation: rec });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get recommendation' });
  }
});

export default router; 