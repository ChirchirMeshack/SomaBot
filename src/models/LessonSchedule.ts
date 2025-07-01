import pool from '../utils/database';

export interface LessonSchedule {
  id?: number;
  user_id: number;
  lesson_id: number;
  scheduled_time: string;
  timezone?: string;
  created_at?: string;
}

export default class LessonScheduleModel {
  /**
   * Schedule a lesson for a user
   */
  static async scheduleLesson(data: Omit<LessonSchedule, 'id' | 'created_at'>): Promise<LessonSchedule> {
    const result = await pool.query(
      `INSERT INTO lesson_schedule (user_id, lesson_id, scheduled_time, timezone)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.user_id, data.lesson_id, data.scheduled_time, data.timezone || null]
    );
    return result.rows[0];
  }

  /**
   * Get all scheduled lessons for a user
   */
  static async getScheduledLessons(user_id: number): Promise<LessonSchedule[]> {
    const result = await pool.query(
      'SELECT * FROM lesson_schedule WHERE user_id = $1 ORDER BY scheduled_time ASC',
      [user_id]
    );
    return result.rows;
  }
} 