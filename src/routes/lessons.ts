import { Router } from 'express';
import LessonModel from '../models/Lesson';

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

export default router; 