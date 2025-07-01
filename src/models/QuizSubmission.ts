import pool from '../utils/database';

export interface QuizSubmission {
  id?: number;
  user_id: number;
  quiz_id: number;
  submitted_answer: string;
  is_correct?: boolean;
  submitted_at?: string;
}

export default class QuizSubmissionModel {
  /**
   * Submit a quiz answer and score it
   */
  static async submitAnswer(data: Omit<QuizSubmission, 'id' | 'is_correct' | 'submitted_at'>, correct_answer: string): Promise<QuizSubmission> {
    const is_correct = data.submitted_answer.trim() === correct_answer.trim();
    const result = await pool.query(
      `INSERT INTO quiz_submissions (user_id, quiz_id, submitted_answer, is_correct)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.user_id, data.quiz_id, data.submitted_answer, is_correct]
    );
    return result.rows[0];
  }

  /**
   * Get all submissions for a user
   */
  static async getUserSubmissions(user_id: number): Promise<QuizSubmission[]> {
    const result = await pool.query(
      'SELECT * FROM quiz_submissions WHERE user_id = $1 ORDER BY submitted_at DESC',
      [user_id]
    );
    return result.rows;
  }
}

export { pool }; 