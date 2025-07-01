import pool from '../utils/database';

export interface Course {
  id?: number;
  title: string;
  description?: string;
  category?: string;
  difficulty?: string;
  created_at?: string;
}

export default class CourseModel {
  /**
   * Create a new course
   */
  static async createCourse(course: Omit<Course, 'id' | 'created_at'>): Promise<Course> {
    const result = await pool.query(
      `INSERT INTO courses (title, description, category, difficulty)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [course.title, course.description || null, course.category || null, course.difficulty || null]
    );
    return result.rows[0];
  }

  /**
   * Get a course by ID
   */
  static async getCourseById(id: number): Promise<Course | null> {
    const result = await pool.query('SELECT * FROM courses WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Update a course by ID
   */
  static async updateCourse(id: number, updates: Partial<Omit<Course, 'id' | 'created_at'>>): Promise<Course | null> {
    const fields = [];
    const values = [];
    let idx = 1;
    for (const key in updates) {
      fields.push(`${key} = $${idx}`);
      values.push((updates as any)[key]);
      idx++;
    }
    if (fields.length === 0) return this.getCourseById(id);
    values.push(id);
    const result = await pool.query(
      `UPDATE courses SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  /**
   * Delete a course by ID
   */
  static async deleteCourse(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM courses WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
} 