CREATE TABLE IF NOT EXISTS progress (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  completed_at TIMESTAMP DEFAULT NOW(),
  score INTEGER,
  PRIMARY KEY (user_id, lesson_id)
); 