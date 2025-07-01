import pool from '../utils/database';

export interface Quiz {
  id?: number;
  lesson_id: number;
  question: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
  difficulty?: string;
  created_at?: string;
}

export default class QuizModel {
  /**
   * Create a new quiz
   */
  static async createQuiz(quiz: Omit<Quiz, 'id' | 'created_at'>): Promise<Quiz> {
    const result = await pool.query(
      `INSERT INTO quizzes (lesson_id, question, options, correct_answer, explanation, difficulty)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [quiz.lesson_id, quiz.question, JSON.stringify(quiz.options), quiz.correct_answer, quiz.explanation || null, quiz.difficulty || 'medium']
    );
    return result.rows[0];
  }

  /**
   * Get a quiz by ID
   */
  static async getQuizById(id: number): Promise<Quiz | null> {
    const result = await pool.query('SELECT * FROM quizzes WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Get all quizzes for a lesson
   */
  static async getQuizzesByLesson(lesson_id: number): Promise<Quiz[]> {
    const result = await pool.query('SELECT * FROM quizzes WHERE lesson_id = $1', [lesson_id]);
    return result.rows;
  }

  /**
   * Update a quiz by ID
   */
  static async updateQuiz(id: number, updates: Partial<Omit<Quiz, 'id' | 'created_at'>>): Promise<Quiz | null> {
    const fields = [];
    const values = [];
    let idx = 1;
    for (const key in updates) {
      if (key === 'options') {
        fields.push(`${key} = $${idx}`);
        values.push(JSON.stringify((updates as any)[key]));
      } else {
        fields.push(`${key} = $${idx}`);
        values.push((updates as any)[key]);
      }
      idx++;
    }
    if (fields.length === 0) return this.getQuizById(id);
    values.push(id);
    const result = await pool.query(
      `UPDATE quizzes SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  /**
   * Delete a quiz by ID
   */
  static async deleteQuiz(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM quizzes WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
} 