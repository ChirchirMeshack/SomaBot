import { Router } from 'express';
import ProgressModel from '../models/Progress';
import QuizSubmission from '../models/QuizSubmission';
import groupService from '../services/groupService';

const router = Router();

/**
 * Get leaderboard for user streaks
 */
router.get('/streaks', async (req, res) => {
  try {
    const top = await ProgressModel.getTopStreaks();
    res.json({ status: 'ok', leaderboard: top });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get streak leaderboard' });
  }
});

/**
 * Get leaderboard for lesson completions
 */
router.get('/completions', async (req, res) => {
  try {
    const top = await ProgressModel.getTopCompletions();
    res.json({ status: 'ok', leaderboard: top });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get completions leaderboard' });
  }
});

/**
 * Get leaderboard for quiz scores
 */
router.get('/quiz-scores', async (req, res) => {
  try {
    const top = await QuizSubmission.getTopQuizScores();
    res.json({ status: 'ok', leaderboard: top });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get quiz score leaderboard' });
  }
});

// Create a group
router.post('/groups/create', async (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ status: 'error', message: 'name required' });
  }
  try {
    const group = await groupService.createGroup(name, description);
    res.json({ status: 'ok', group });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to create group' });
  }
});

// Join a group by code
router.post('/groups/join', async (req, res) => {
  const { user_id, code } = req.body;
  if (!user_id || !code) {
    return res.status(400).json({ status: 'error', message: 'user_id and code required' });
  }
  try {
    const group = await groupService.joinGroup(user_id, code);
    res.json({ status: 'ok', group });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to join group' });
  }
});

// List user's groups
router.get('/groups/list/:user_id', async (req, res) => {
  try {
    const groups = await groupService.listUserGroups(Number(req.params.user_id));
    res.json({ status: 'ok', groups });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to list groups' });
  }
});

// List group members
router.get('/groups/members/:group_id', async (req, res) => {
  try {
    const members = await groupService.listGroupMembers(Number(req.params.group_id));
    res.json({ status: 'ok', members });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to list members' });
  }
});

export default router; 