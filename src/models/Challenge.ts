import pool from '../utils/database';

export interface Challenge {
  id?: number;
  type: 'daily' | 'weekly';
  description: string;
  goal: number;
  start_date: Date;
  end_date: Date;
}

export interface UserChallenge {
  id?: number;
  user_id: number;
  challenge_id: number;
  progress: number;
  completed: boolean;
  opted_in: boolean;
  last_updated?: Date;
}

const ChallengeModel = {
  async createChallenge(data: Challenge) {
    const result = await pool.query(
      `INSERT INTO challenges (type, description, goal, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.type, data.description, data.goal, data.start_date, data.end_date]
    );
    return result.rows[0];
  },
  async getActiveChallenges(now = new Date()) {
    const result = await pool.query(
      `SELECT * FROM challenges WHERE start_date <= $1 AND end_date >= $1`,
      [now]
    );
    return result.rows;
  },
  async optIn(user_id: number, challenge_id: number) {
    const result = await pool.query(
      `INSERT INTO user_challenges (user_id, challenge_id, opted_in, last_updated)
       VALUES ($1, $2, TRUE, NOW())
       ON CONFLICT (user_id, challenge_id) DO UPDATE SET opted_in = TRUE, last_updated = NOW()
       RETURNING *`,
      [user_id, challenge_id]
    );
    return result.rows[0];
  },
  async getUserChallenges(user_id: number) {
    const result = await pool.query(
      `SELECT uc.*, c.type, c.description, c.goal, c.start_date, c.end_date
       FROM user_challenges uc
       JOIN challenges c ON uc.challenge_id = c.id
       WHERE uc.user_id = $1`,
      [user_id]
    );
    return result.rows;
  },
  async updateProgress(user_id: number, challenge_id: number, increment = 1) {
    const result = await pool.query(
      `UPDATE user_challenges
       SET progress = progress + $1, last_updated = NOW(),
           completed = (progress + $1) >= (SELECT goal FROM challenges WHERE id = $2)
       WHERE user_id = $3 AND challenge_id = $2
       RETURNING *`,
      [increment, challenge_id, user_id]
    );
    return result.rows[0];
  }
};

export default ChallengeModel; 