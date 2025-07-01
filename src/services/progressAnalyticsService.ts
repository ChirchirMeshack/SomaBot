import pool from '../utils/database';

const progressAnalyticsService = {
  // Lessons completed per day (last 30 days)
  async completionsPerDay() {
    const result = await pool.query(`
      SELECT DATE(completed_at) as day, COUNT(*) as completions
      FROM progress
      WHERE completed_at >= NOW() - INTERVAL '30 days'
      GROUP BY day
      ORDER BY day DESC
    `);
    return result.rows;
  },
  // Most active hours (UTC)
  async activeHours() {
    const result = await pool.query(`
      SELECT EXTRACT(HOUR FROM completed_at) as hour, COUNT(*) as completions
      FROM progress
      WHERE completed_at >= NOW() - INTERVAL '30 days'
      GROUP BY hour
      ORDER BY completions DESC
    `);
    return result.rows;
  },
  // Retention: % of users returning after 1, 7, 30 days
  async retentionRates() {
    // Users who completed a lesson on day 0
    const { rows: day0 } = await pool.query(`
      SELECT user_id, MIN(DATE(completed_at)) as first_day
      FROM progress
      GROUP BY user_id
    `);
    let day1 = 0, day7 = 0, day30 = 0;
    for (const u of day0) {
      const { rows } = await pool.query(`
        SELECT COUNT(*) as cnt
        FROM progress
        WHERE user_id = $1 AND DATE(completed_at) > $2 AND DATE(completed_at) <= $2 + INTERVAL '1 day'
      `, [u.user_id, u.first_day]);
      if (Number(rows[0].cnt) > 0) day1++;
      const { rows: rows7 } = await pool.query(`
        SELECT COUNT(*) as cnt
        FROM progress
        WHERE user_id = $1 AND DATE(completed_at) > $2 AND DATE(completed_at) <= $2 + INTERVAL '7 day'
      `, [u.user_id, u.first_day]);
      if (Number(rows7[0].cnt) > 0) day7++;
      const { rows: rows30 } = await pool.query(`
        SELECT COUNT(*) as cnt
        FROM progress
        WHERE user_id = $1 AND DATE(completed_at) > $2 AND DATE(completed_at) <= $2 + INTERVAL '30 day'
      `, [u.user_id, u.first_day]);
      if (Number(rows30[0].cnt) > 0) day30++;
    }
    const total = day0.length || 1;
    return {
      day1: Math.round((day1 / total) * 100),
      day7: Math.round((day7 / total) * 100),
      day30: Math.round((day30 / total) * 100),
      total_users: total
    };
  }
};

export default progressAnalyticsService; 