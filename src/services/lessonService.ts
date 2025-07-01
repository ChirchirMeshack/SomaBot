import LessonModel from '../models/Lesson';
import pool from '../utils/database';

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