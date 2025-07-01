import { Router } from 'express';
import CourseModel, { pool } from '../models/Course';
import LessonModel from '../models/Lesson';

const router = Router();

/**
 * List all courses, with optional filtering by category and difficulty
 * Query params: category, difficulty
 */
router.get('/', async (req, res) => {
  const { category, difficulty } = req.query;
  try {
    let query = 'SELECT * FROM courses';
    const conditions = [];
    const values: string[] = [];
    let idx = 1;
    if (category) {
      conditions.push(`category = $${idx++}`);
      values.push(category as string);
    }
    if (difficulty) {
      conditions.push(`difficulty = $${idx++}`);
      values.push(difficulty as string);
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY id DESC';
    const result = await pool.query(query, values);
    res.json({ status: 'ok', courses: result.rows });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get courses' });
  }
});

/**
 * Get course details with lesson count
 */
router.get('/:id', async (req, res) => {
  try {
    const course = await CourseModel.getCourseById(Number(req.params.id));
    if (!course) {
      return res.status(404).json({ status: 'error', message: 'Course not found' });
    }
    const lessons = await LessonModel.getLessonsByCourse(course.id!);
    res.json({ status: 'ok', course, lessonCount: lessons.length });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get course details' });
  }
});

export default router; 