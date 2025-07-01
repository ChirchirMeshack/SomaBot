import pool from '../utils/database';

export interface QuizSchedule {
  id?: number;
  user_id: number;
  quiz_id: number;
  scheduled_time: string;
  delivered?: boolean;
  created_at?: string;
}

export default class QuizScheduleModel {
  /**
   * Schedule a quiz for a user
   */
  static async scheduleQuiz(data: Omit<QuizSchedule, 'id' | 'created_at' | 'delivered'>): Promise<QuizSchedule> {
    const result = await pool.query(
      `INSERT INTO quiz_schedule (user_id, quiz_id, scheduled_time)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.user_id, data.quiz_id, data.scheduled_time]
    );
    return result.rows[0];
  }

  /**
   * Get all scheduled quizzes for a user
   */
  static async getScheduledQuizzes(user_id: number): Promise<QuizSchedule[]> {
    const result = await pool.query(
      'SELECT * FROM quiz_schedule WHERE user_id = $1 ORDER BY scheduled_time ASC',
      [user_id]
    );
    return result.rows;
  }

  /**
   * Get all pending (not delivered) scheduled quizzes
   */
  static async getPendingScheduledQuizzes(): Promise<QuizSchedule[]> {
    const result = await pool.query(
      'SELECT * FROM quiz_schedule WHERE delivered = FALSE ORDER BY scheduled_time ASC'
    );
    return result.rows;
  }
} 