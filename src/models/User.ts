import pool from '../utils/database';

export interface User {
  id?: number;
  phone: string;
  name?: string;
  subscription_tier?: string;
  preferences?: object;
  created_at?: string;
}

export default class UserModel {
  /**
   * Create a new user
   */
  static async createUser(user: Omit<User, 'id' | 'created_at'>): Promise<User> {
    const result = await pool.query(
      `INSERT INTO users (phone, name, subscription_tier, preferences)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user.phone, user.name || null, user.subscription_tier || 'free', user.preferences || {}]
    );
    return result.rows[0];
  }

  /**
   * Get a user by ID
   */
  static async getUserById(id: number): Promise<User | null> {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Update a user by ID
   */
  static async updateUser(id: number, updates: Partial<Omit<User, 'id' | 'created_at'>>): Promise<User | null> {
    const fields = [];
    const values = [];
    let idx = 1;
    for (const key in updates) {
      fields.push(`${key} = $${idx}`);
      values.push((updates as any)[key]);
      idx++;
    }
    if (fields.length === 0) return this.getUserById(id);
    values.push(id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  /**
   * Delete a user by ID
   */
  static async deleteUser(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get a user by phone number
   */
  static async getUserByPhone(phone: string): Promise<User | null> {
    const result = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
    return result.rows[0] || null;
  }
} 