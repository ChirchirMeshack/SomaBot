-- Create groups table
CREATE TABLE groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  description TEXT,
  code VARCHAR(12) UNIQUE NOT NULL
);

-- Create user_groups table
CREATE TABLE user_groups (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, group_id)
); 