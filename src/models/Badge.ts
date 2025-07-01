import pool from '../utils/database';

export interface Badge {
  id?: number;
  name: string;
  description?: string;
  icon_url?: string;
  criteria?: string;
  created_at?: string;
}

export interface UserBadge {
  id?: number;
  user_id: number;
  badge_id: number;
  awarded_at?: string;
}

export default class BadgeModel {
  /**
   * Create a new badge
   */
  static async createBadge(badge: Omit<Badge, 'id' | 'created_at'>): Promise<Badge> {
    const result = await pool.query(
      `INSERT INTO badges (name, description, icon_url, criteria)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [badge.name, badge.description || null, badge.icon_url || null, badge.criteria || null]
    );
    return result.rows[0];
  }

  /**
   * Award a badge to a user
   */
  static async awardBadge(user_id: number, badge_id: number): Promise<UserBadge> {
    const result = await pool.query(
      `INSERT INTO user_badges (user_id, badge_id)
       VALUES ($1, $2)
       RETURNING *`,
      [user_id, badge_id]
    );
    return result.rows[0];
  }

  /**
   * Get all badges for a user
   */
  static async getUserBadges(user_id: number): Promise<(UserBadge & Badge)[]> {
    const result = await pool.query(
      `SELECT ub.*, b.name, b.description, b.icon_url, b.criteria
       FROM user_badges ub
       JOIN badges b ON ub.badge_id = b.id
       WHERE ub.user_id = $1
       ORDER BY ub.awarded_at DESC`,
      [user_id]
    );
    return result.rows;
  }
} 