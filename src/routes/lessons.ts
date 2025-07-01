import { Router } from 'express';
import LessonModel from '../models/Lesson';
import * as lessonService from '../services/lessonService';
import { formatLessonForWhatsApp } from '../services/whatsappService';
import LessonScheduleModel from '../models/LessonSchedule';

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

export default router; 