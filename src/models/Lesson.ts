import pool from '../utils/database';

export interface Lesson {
  id?: number;
  course_id: number;
  title: string;
  content?: string;
  lesson_order?: number;
  media_url?: string;
  created_at?: string;
}

export default class LessonModel {
  /**
   * Create a new lesson
   */
  static async createLesson(lesson: Omit<Lesson, 'id' | 'created_at'>): Promise<Lesson> {
    const result = await pool.query(
      `INSERT INTO lessons (course_id, title, content, lesson_order, media_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [lesson.course_id, lesson.title, lesson.content || null, lesson.lesson_order || null, lesson.media_url || null]
    );
    return result.rows[0];
  }

  /**
   * Get a lesson by ID
   */
  static async getLessonById(id: number): Promise<Lesson | null> {
    const result = await pool.query('SELECT * FROM lessons WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Get all lessons for a course
   */
  static async getLessonsByCourse(course_id: number): Promise<Lesson[]> {
    const result = await pool.query('SELECT * FROM lessons WHERE course_id = $1 ORDER BY lesson_order ASC', [course_id]);
    return result.rows;
  }

  /**
   * Update a lesson by ID
   */
  static async updateLesson(id: number, updates: Partial<Omit<Lesson, 'id' | 'created_at'>>): Promise<Lesson | null> {
    const fields = [];
    const values = [];
    let idx = 1;
    for (const key in updates) {
      fields.push(`${key} = $${idx}`);
      values.push((updates as any)[key]);
      idx++;
    }
    if (fields.length === 0) return this.getLessonById(id);
    values.push(id);
    const result = await pool.query(
      `UPDATE lessons SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  /**
   * Delete a lesson by ID
   */
  static async deleteLesson(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM lessons WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
} 