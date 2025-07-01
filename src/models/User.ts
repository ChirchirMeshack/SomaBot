import pool from '../utils/database';

export interface User {
  id?: number;
  phone: string;
  name?: string;
  subscription_tier?: string;
  preferences?: object;
  created_at?: string;
  status?: string; // active, inactive, subscribed, etc.
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

  /**
   * Set user preferences by phone number
   */
  static async setPreferences(phone: string, preferences: object): Promise<User | null> {
    const result = await pool.query(
      'UPDATE users SET preferences = $1 WHERE phone = $2 RETURNING *',
      [preferences, phone]
    );
    return result.rows[0] || null;
  }

  /**
   * Get user preferences by phone number
   */
  static async getPreferences(phone: string): Promise<object | null> {
    const result = await pool.query('SELECT preferences FROM users WHERE phone = $1', [phone]);
    return result.rows[0]?.preferences || null;
  }

  /**
   * Update a user by phone number
   */
  static async updateUserByPhone(phone: string, updates: Partial<Omit<User, 'id' | 'created_at' | 'phone'>>): Promise<User | null> {
    const fields = [];
    const values = [];
    let idx = 1;
    for (const key in updates) {
      fields.push(`${key} = $${idx}`);
      values.push((updates as any)[key]);
      idx++;
    }
    if (fields.length === 0) return this.getUserByPhone(phone);
    values.push(phone);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE phone = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  /**
   * Set user status by phone number
   */
  static async setStatus(phone: string, status: string): Promise<User | null> {
    const result = await pool.query(
      'UPDATE users SET status = $1 WHERE phone = $2 RETURNING *',
      [status, phone]
    );
    return result.rows[0] || null;
  }

  /**
   * Get user status by phone number
   */
  static async getStatus(phone: string): Promise<string | null> {
    const result = await pool.query('SELECT status FROM users WHERE phone = $1', [phone]);
    return result.rows[0]?.status || null;
  }

  /**
   * Search users by phone, name, status with pagination
   */
  static async searchUsers({ phone, name, status, limit = 10, offset = 0 }: { phone?: string; name?: string; status?: string; limit?: number; offset?: number }): Promise<User[]> {
    const conditions = [];
    const values = [];
    let idx = 1;
    if (phone) {
      conditions.push(`phone ILIKE $${idx++}`);
      values.push(`%${phone}%`);
    }
    if (name) {
      conditions.push(`name ILIKE $${idx++}`);
      values.push(`%${name}%`);
    }
    if (status) {
      conditions.push(`status = $${idx++}`);
      values.push(status);
    }
    let query = 'SELECT * FROM users';
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ` ORDER BY id DESC LIMIT $${idx++} OFFSET $${idx}`;
    values.push(limit, offset);
    const result = await pool.query(query, values);
    return result.rows;
  }
} 