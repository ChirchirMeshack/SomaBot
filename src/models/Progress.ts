import pool from '../utils/database';

export interface Progress {
  id?: number;
  user_id: number;
  lesson_id: number;
  course_id: number;
  completed_at?: string;
  score?: number;
  time_spent?: number;
  streak_count?: number;
}

export default class ProgressModel {
  /**
   * Calculate the current learning streak for a user (consecutive days with completions)
   */
  static async calculateStreak(user_id: number): Promise<number> {
    const result = await pool.query(
      `SELECT completed_at::date as date
       FROM progress
       WHERE user_id = $1
       GROUP BY completed_at::date
       ORDER BY date DESC`,
      [user_id]
    );
    let streak = 0;
    let current = new Date();
    for (const row of result.rows) {
      const date = new Date(row.date);
      if (
        date.getFullYear() === current.getFullYear() &&
        date.getMonth() === current.getMonth() &&
        date.getDate() === current.getDate()
      ) {
        streak++;
        current.setDate(current.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  /**
   * Mark a lesson as completed for a user and update streak_count
   */
  static async completeLesson(data: Omit<Progress, 'completed_at'>): Promise<Progress> {
    // First, mark the lesson as complete
    const result = await pool.query(
      `INSERT INTO progress (user_id, lesson_id, course_id, score, time_spent, streak_count)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, lesson_id) DO UPDATE SET score = EXCLUDED.score, time_spent = EXCLUDED.time_spent, completed_at = NOW()
       RETURNING *`,
      [data.user_id, data.lesson_id, data.course_id, data.score || null, data.time_spent || null, null]
    );
    // Now, calculate the new streak
    const streak = await this.calculateStreak(data.user_id);
    // Update the streak_count for this progress record
    const updated = await pool.query(
      `UPDATE progress SET streak_count = $1 WHERE id = $2 RETURNING *`,
      [streak, result.rows[0].id]
    );
    return updated.rows[0];
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

  /**
   * Get top users by current streak (leaderboard)
   */
  static async getTopStreaks(limit = 10): Promise<any[]> {
    const result = await pool.query(
      `SELECT user_id, MAX(streak_count) as max_streak
       FROM progress
       GROUP BY user_id
       ORDER BY max_streak DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /**
   * Get top users by lesson completions (leaderboard)
   */
  static async getTopCompletions(limit = 10): Promise<any[]> {
    const result = await pool.query(
      `SELECT user_id, COUNT(*) as completions
       FROM progress
       GROUP BY user_id
       ORDER BY completions DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }
} 