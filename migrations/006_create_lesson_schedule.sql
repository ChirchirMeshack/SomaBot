CREATE TABLE IF NOT EXISTS lesson_schedule (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMP NOT NULL,
  timezone VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
); 