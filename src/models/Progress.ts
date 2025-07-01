import pool from '../utils/database';

export interface Progress {
  user_id: number;
  lesson_id: number;
  course_id: number;
  completed_at?: string;
  score?: number;
}

export default class ProgressModel {
  /**
   * Mark a lesson as completed for a user
   */
  static async completeLesson(data: Omit<Progress, 'completed_at'>): Promise<Progress> {
    const result = await pool.query(
      `INSERT INTO progress (user_id, lesson_id, course_id, score)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, lesson_id) DO UPDATE SET score = EXCLUDED.score, completed_at = NOW()
       RETURNING *`,
      [data.user_id, data.lesson_id, data.course_id, data.score || null]
    );
    return result.rows[0];
  }

  /**
   * Get all progress for a user
   */
  static async getUserProgress(user_id: number): Promise<Progress[]> {
    const result = await pool.query(
      'SELECT * FROM progress WHERE user_id = $1 ORDER BY completed_at DESC',
      [user_id]
    );
    return result.rows;
  }
} 