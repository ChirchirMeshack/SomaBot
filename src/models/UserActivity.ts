import pool from '../utils/database';

export interface UserActivity {
  id?: number;
  user_id: number;
  action: string;
  metadata?: object;
  created_at?: string;
}

export default class UserActivityModel {
  /**
   * Log a user action
   */
  static async logAction(user_id: number, action: string, metadata: object = {}): Promise<UserActivity> {
    const result = await pool.query(
      `INSERT INTO user_activity (user_id, action, metadata) VALUES ($1, $2, $3) RETURNING *`,
      [user_id, action, metadata]
    );
    return result.rows[0];
  }

  /**
   * Get user actions by user_id and date range
   */
  static async getActions(user_id: number, from?: string, to?: string): Promise<UserActivity[]> {
    let query = 'SELECT * FROM user_activity WHERE user_id = $1';
    const values: (number | string)[] = [user_id];
    if (from) {
      query += ' AND created_at >= $2';
      values.push(from);
    }
    if (to) {
      query += from ? ' AND created_at <= $3' : ' AND created_at <= $2';
      values.push(to);
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, values);
    return result.rows;
  }
} 