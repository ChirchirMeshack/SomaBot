import pool from '../utils/database';

export interface Group {
  id?: number;
  name: string;
  description?: string;
  code: string;
}

const GroupModel = {
  async createGroup(data: { name: string; description?: string }) {
    // Generate a unique code (simple random alphanumeric)
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const result = await pool.query(
      `INSERT INTO groups (name, description, code) VALUES ($1, $2, $3) RETURNING *`,
      [data.name, data.description || null, code]
    );
    return result.rows[0];
  },
  async joinGroup(user_id: number, code: string) {
    const groupRes = await pool.query(`SELECT * FROM groups WHERE code = $1`, [code]);
    if (!groupRes.rows[0]) throw new Error('Group not found');
    const group = groupRes.rows[0];
    await pool.query(
      `INSERT INTO user_groups (user_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [user_id, group.id]
    );
    return group;
  },
  async listUserGroups(user_id: number) {
    const result = await pool.query(
      `SELECT g.* FROM groups g JOIN user_groups ug ON g.id = ug.group_id WHERE ug.user_id = $1`,
      [user_id]
    );
    return result.rows;
  },
  async listGroupMembers(group_id: number) {
    const result = await pool.query(
      `SELECT u.id, u.name, u.phone FROM users u JOIN user_groups ug ON u.id = ug.user_id WHERE ug.group_id = $1`,
      [group_id]
    );
    return result.rows;
  }
};

export default GroupModel; 