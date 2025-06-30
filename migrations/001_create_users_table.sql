-- Up migration: create the users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100),
  subscription_tier VARCHAR(20) DEFAULT 'free',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Down migration: drop the users table
DROP TABLE IF EXISTS users; 