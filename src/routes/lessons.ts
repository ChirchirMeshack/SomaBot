import { Router } from 'express';
import LessonModel from '../models/Lesson';
import * as lessonService from '../services/lessonService';
import { formatLessonForWhatsApp } from '../services/whatsappService';
import LessonScheduleModel from '../models/LessonSchedule';
import ProgressModel from '../models/Progress';
import pool from '../utils/database';
import { checkAndCelebrateMilestones } from '../services/milestoneService';
import challengeService from '../services/challengeService';

const router = Router();

/**
 * Create a new lesson
 * Expects { course_id, title, content, lesson_order, media_url } in the request body
 */
router.post('/', async (req, res) => {
  try {
    const lesson = await LessonModel.createLesson(req.body);
    res.json({ status: 'ok', lesson });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to create lesson' });
  }
});

/**
 * Get a lesson by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const lesson = await LessonModel.getLessonById(Number(req.params.id));
    if (!lesson) {
      return res.status(404).json({ status: 'error', message: 'Lesson not found' });
    }
    res.json({ status: 'ok', lesson });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get lesson' });
  }
});

/**
 * Get all lessons for a course
 */
router.get('/course/:course_id', async (req, res) => {
  try {
    const lessons = await LessonModel.getLessonsByCourse(Number(req.params.course_id));
    res.json({ status: 'ok', lessons });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get lessons' });
  }
});

/**
 * Update a lesson by ID
 */
router.put('/:id', async (req, res) => {
  try {
    const lesson = await LessonModel.updateLesson(Number(req.params.id), req.body);
    if (!lesson) {
      return res.status(404).json({ status: 'error', message: 'Lesson not found' });
    }
    res.json({ status: 'ok', lesson });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to update lesson' });
  }
});

/**
 * Delete a lesson by ID
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await LessonModel.deleteLesson(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ status: 'error', message: 'Lesson not found' });
    }
    res.json({ status: 'ok', message: 'Lesson deleted' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to delete lesson' });
  }
});

/**
 * Get the next lesson for a user in a course
 */
router.get('/next/:user_id/:course_id', async (req, res) => {
  try {
    const nextLesson = await lessonService.getNextLesson(Number(req.params.user_id), Number(req.params.course_id));
    if (!nextLesson) {
      return res.status(404).json({ status: 'error', message: 'No next lesson found (all completed?)' });
    }
    res.json({ status: 'ok', nextLesson });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get next lesson' });
  }
});

/**
 * Format a lesson for WhatsApp delivery
 */
router.get('/format/:id', async (req, res) => {
  try {
    const lesson = await LessonModel.getLessonById(Number(req.params.id));
    if (!lesson) {
      return res.status(404).json({ status: 'error', message: 'Lesson not found' });
    }
    const formatted = formatLessonForWhatsApp(lesson);
    res.json({ status: 'ok', formatted });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to format lesson' });
  }
});

/**
 * Schedule a lesson for a user
 * Expects { user_id, lesson_id, scheduled_time, timezone } in the request body
 */
router.post('/schedule', async (req, res) => {
  try {
    const scheduled = await LessonScheduleModel.scheduleLesson(req.body);
    res.json({ status: 'ok', scheduled });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to schedule lesson' });
  }
});

/**
 * Get all scheduled lessons for a user
 */
router.get('/schedule/:user_id', async (req, res) => {
  try {
    const scheduled = await LessonScheduleModel.getScheduledLessons(Number(req.params.user_id));
    res.json({ status: 'ok', scheduled });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get scheduled lessons' });
  }
});

/**
 * Deliver a lesson to a user via WhatsApp
 * Expects { user_id, lesson_id } in the request body
 */
router.post('/deliver', async (req, res) => {
  const { user_id, lesson_id } = req.body;
  if (!user_id || !lesson_id) {
    return res.status(400).json({ status: 'error', message: 'user_id and lesson_id are required' });
  }
  try {
    const result = await lessonService.deliverLesson(Number(user_id), Number(lesson_id));
    res.json(result);
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to deliver lesson' });
  }
});

/**
 * Mark a lesson as completed for a user
 * Expects { user_id, lesson_id, course_id, score } in the request body
 */
router.post('/complete', async (req, res) => {
  try {
    const progress = await ProgressModel.completeLesson(req.body);
    // Update challenge progress for all active challenges
    if (req.body.user_id) {
      const userChallenges = await challengeService.getUserStatus(Number(req.body.user_id));
      for (const uc of userChallenges) {
        if (uc.opted_in && !uc.completed) {
          await challengeService.updateProgress(uc.user_id, uc.challenge_id, 1);
        }
      }
    }
    // Check for milestone and celebrate if needed
    let milestoneMessage = null;
    if (req.body.user_id) {
      milestoneMessage = await checkAndCelebrateMilestones(Number(req.body.user_id));
    }
    res.json({ status: 'ok', progress, milestone: milestoneMessage });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to mark lesson as completed' });
  }
});

/**
 * Get all progress for a user
 */
router.get('/progress/:user_id', async (req, res) => {
  try {
    const progress = await ProgressModel.getUserProgress(Number(req.params.user_id));
    res.json({ status: 'ok', progress });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get user progress' });
  }
});

/**
 * Get lesson completion count for all lessons
 */
router.get('/analytics/completions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT lesson_id, COUNT(*) as completions
       FROM progress
       GROUP BY lesson_id
       ORDER BY completions DESC`
    );
    res.json({ status: 'ok', completions: result.rows });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get completions analytics' });
  }
});

/**
 * Get most popular lessons (by completions)
 * Optional query param: limit
 */
router.get('/analytics/popular', async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;
  try {
    const result = await pool.query(
      `SELECT lesson_id, COUNT(*) as completions
       FROM progress
       GROUP BY lesson_id
       ORDER BY completions DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ status: 'ok', popular: result.rows });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get popular lessons' });
  }
});

/**
 * Get user engagement (lessons completed per user)
 */
router.get('/analytics/user/:user_id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id, COUNT(*) as lessons_completed
       FROM progress
       WHERE user_id = $1
       GROUP BY user_id`,
      [Number(req.params.user_id)]
    );
    res.json({ status: 'ok', engagement: result.rows[0] || { user_id: req.params.user_id, lessons_completed: 0 } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get user engagement' });
  }
});

export default router; 