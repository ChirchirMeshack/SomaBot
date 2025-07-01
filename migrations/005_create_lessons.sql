CREATE TABLE IF NOT EXISTS lessons (
  id SERIAL PRIMARY KEY,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  lesson_order INTEGER,
  media_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
); 