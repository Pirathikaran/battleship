const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function initDb() {
  const db = await open({
    filename: './battleship.db',
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      state TEXT NOT NULL,  -- ongoing, finished, etc.
      turn TEXT NOT NULL    -- 'player' or 'computer'
    );
    
    CREATE TABLE IF NOT EXISTS ships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      player TEXT NOT NULL,  -- 'player' or 'computer'
      type TEXT NOT NULL,    -- e.g., battleship, destroyer
      size INTEGER NOT NULL,
      is_sunk BOOLEAN NOT NULL DEFAULT 0,
      FOREIGN KEY (game_id) REFERENCES games(id)
    );
    
    CREATE TABLE IF NOT EXISTS ship_coordinates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ship_id INTEGER NOT NULL,
      row INTEGER NOT NULL,  -- row of the ship's coordinate
      col INTEGER NOT NULL,  -- column of the ship's coordinate
      is_hit BOOLEAN NOT NULL DEFAULT 0,
      FOREIGN KEY (ship_id) REFERENCES ships(id)
    );
    
    CREATE TABLE IF NOT EXISTS shots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      player TEXT NOT NULL,  -- 'player' or 'computer'
      row INTEGER NOT NULL,  -- row of the shot
      col INTEGER NOT NULL,  -- column of the shot
      result TEXT NOT NULL,  -- 'hit' or 'miss'
      FOREIGN KEY (game_id) REFERENCES games(id)
    );
  `);

  return db;
}

module.exports = initDb;
