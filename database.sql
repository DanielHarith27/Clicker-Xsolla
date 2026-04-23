-- Create database
CREATE DATABASE IF NOT EXISTS clicker_game;

-- Use the database
\c clicker_game

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create game_state table
CREATE TABLE IF NOT EXISTS game_state (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  coins BIGINT DEFAULT 0,
  coins_per_second REAL DEFAULT 0,
  level INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create upgrades table
CREATE TABLE IF NOT EXISTS upgrades (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_cost BIGINT NOT NULL,
  coins_per_second_gain REAL NOT NULL,
  icon VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_upgrades table
CREATE TABLE IF NOT EXISTS user_upgrades (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  upgrade_id INTEGER NOT NULL,
  owned_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, upgrade_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (upgrade_id) REFERENCES upgrades(id) ON DELETE CASCADE
);

-- Create levels table
CREATE TABLE IF NOT EXISTS levels (
  id SERIAL PRIMARY KEY,
  level_number INTEGER NOT NULL UNIQUE,
  coin_threshold BIGINT NOT NULL,
  unlock_cost INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_levels table (tracks which levels player has unlocked)
CREATE TABLE IF NOT EXISTS user_levels (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  level_number INTEGER NOT NULL,
  unlocked BOOLEAN DEFAULT FALSE,
  unlocked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, level_number),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create payment_records table
CREATE TABLE IF NOT EXISTS payment_records (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  xsolla_payment_id VARCHAR(255) UNIQUE,
  level_number INTEGER,
  amount_cents INTEGER,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for faster queries
CREATE INDEX idx_game_state_user_id ON game_state(user_id);
CREATE INDEX idx_user_upgrades_user_id ON user_upgrades(user_id);
CREATE INDEX idx_user_levels_user_id ON user_levels(user_id);
CREATE INDEX idx_payment_records_user_id ON payment_records(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_upgrades_name_unique ON upgrades(name);

-- Insert default upgrades (20 upgrades with scaling costs)
INSERT INTO upgrades (name, description, base_cost, coins_per_second_gain, icon) VALUES
  ('Cursor', 'A helpful cursor to click faster', 10, 0.1, '👆'),
  ('Grandma', 'A nice grandma to help click', 100, 1, '👵'),
  ('Farm', 'A farm that grows coins', 500, 5, '🚜'),
  ('Factory', 'A factory producing coins', 2000, 20, '🏭'),
  ('Bank', 'A bank handling your coins', 10000, 100, '🏦'),
  ('Wizard', 'A magical wizard creating coins', 50000, 500, '🧙'),
  ('Robot', 'A clicking robot', 250000, 2500, '🤖'),
  ('Alien', 'An alien worker from space', 1000000, 10000, '👽'),
  ('Wizard Tower', 'A tower of wizards', 5000000, 50000, '🏰'),
  ('Time Machine', 'Harvest coins from the past', 25000000, 250000, '⏰'),
  ('Spaceship', 'A coin-collecting spaceship', 100000000, 1000000, '🚀'),
  ('Portal', 'A portal to coin dimension', 500000000, 5000000, '🌀'),
  ('Infinity Engine', 'An engine of infinite coins', 2000000000, 20000000, '♾️'),
  ('Multiverse Generator', 'Coins from alternate universes', 10000000000, 100000000, '🌌'),
  ('God Mode', 'Godly powers of coin creation', 50000000000, 500000000, '✨'),
  ('Quantum Mine', 'Extracts coins from quantum foam', 250000000000, 2500000000, '⚛️'),
  ('Nebula Forge', 'Forges coin clusters in a nebula core', 1000000000000, 10000000000, '🛠️'),
  ('Black Hole Vault', 'Compresses matter into premium coins', 5000000000000, 50000000000, '🕳️'),
  ('Celestial Bazaar', 'Trades stardust for compounding profit', 20000000000000, 200000000000, '🛒'),
  ('Singularity Core', 'A runaway engine of autonomous growth', 100000000000000, 1000000000000, '☄️')
ON CONFLICT (name) DO NOTHING;

-- Insert default levels (20 levels)
INSERT INTO levels (level_number, coin_threshold, unlock_cost) VALUES
  (1, 0, NULL),
  (2, 100, 299),
  (3, 500, 299),
  (4, 2500, 299),
  (5, 10000, 299),
  (6, 50000, 299),
  (7, 250000, 299),
  (8, 1000000, 299),
  (9, 5000000, 299),
  (10, 25000000, 299),
  (11, 100000000, 299),
  (12, 250000000, 299),
  (13, 500000000, 299),
  (14, 1000000000, 299),
  (15, 2500000000, 299),
  (16, 5000000000, 299),
  (17, 10000000000, 299),
  (18, 25000000000, 299),
  (19, 50000000000, 299),
  (20, 100000000000, 299)
ON CONFLICT DO NOTHING;
