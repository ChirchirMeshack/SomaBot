import LessonModel from '../models/Lesson';
import pool from '../utils/database';
import UserModel from '../models/User';
import { formatLessonForWhatsApp, sendMessage } from './whatsappService';

/**
 * Get the next lesson for a user in a course based on completed lessons
 */
export async function getNextLesson(user_id: number, course_id: number) {
  // Get all lessons for the course, ordered
  const lessons = await LessonModel.getLessonsByCourse(course_id);
  // Get completed lesson IDs for the user in this course
  const result = await pool.query(
    'SELECT lesson_id FROM progress WHERE user_id = $1 AND course_id = $2',
    [user_id, course_id]
  );
  const completedLessonIds = result.rows.map((row: any) => row.lesson_id);
  // Find the first lesson not completed
  return lessons.find(lesson => !completedLessonIds.includes(lesson.id));
}

/**
 * Deliver a lesson to a user via WhatsApp
 */
export async function deliverLesson(user_id: number, lesson_id: number) {
  // Get user and lesson
  const user = await UserModel.getUserById(user_id);
  const lesson = await LessonModel.getLessonById(lesson_id);
  if (!user || !lesson) return { status: 'error', message: 'User or lesson not found' };
  // Format lesson for WhatsApp
  const formatted = formatLessonForWhatsApp(lesson);
  // Send each message chunk
  for (const msg of formatted.messages) {
    await sendMessage({ to: user.phone, body: msg });
  }
  // Send media if present
  if (formatted.media_url) {
    await sendMessage({ to: user.phone, body: `Media: ${formatted.media_url}` });
  }
  return { status: 'ok', message: 'Lesson delivered' };
} 