const initDb = require('../db/connection');

class GameRepository {
  constructor() {
    this.db = null;
    this.init();
  }

  async init() {
    this.db = await initDb();
  }

  async createGame() {
    await this.init();
    const query = `INSERT INTO games (state, turn) VALUES ('ongoing', 'player')`;
    await this.db.run(query);
    const gameId = await this.db.get(`SELECT last_insert_rowid() AS id`);
    return gameId.id;
  }

  async saveShips(gameId, player, ships) {
    for (let ship of ships) {
      const query = `INSERT INTO ships (game_id, player, type, size, is_sunk) VALUES (?, ?, ?, ?, 0)`;
      const result = await this.db.run(query, [gameId, player, ship.type, ship.size]);
      const shipId = result.lastID;
      await this._saveShipCoordinates(shipId, ship);
    }
  }

  async _saveShipCoordinates(shipId, ship) {
    const { size, orientation, startRow, startCol } = ship;
    for (let i = 0; i < size; i++) {
      let row = startRow;
      let col = startCol;
      if (orientation === 'horizontal') col += i;
      else row += i;

      const coordQuery = `INSERT INTO ship_coordinates (ship_id, row, col) VALUES (?, ?, ?)`;
      await this.db.run(coordQuery, [shipId, row, col]);
    }
  }

  async recordShot(gameId, player, row, col) {
    const opponent = player === 'player' ? 'computer' : 'player';
    const shotQuery = `SELECT ship_id, is_hit FROM ship_coordinates 
                       WHERE ship_id IN (SELECT id FROM ships WHERE game_id = ? AND player = ?) 
                       AND row = ? AND col = ?`;
    const result = await this.db.get(shotQuery, [gameId, opponent, row, col]);

    if (result) {
      await this.db.run(`UPDATE ship_coordinates SET is_hit = 1 WHERE ship_id = ? AND row = ? AND col = ?`, [result.ship_id, row, col]);
      const shipStatus = await this._checkIfShipSunk(result.ship_id);
      return { hit: true, shipSunk: shipStatus.isSunk, message: shipStatus.isSunk ? 'You sunk a ship!' : 'Hit!' };
    }

    return { hit: false, message: 'Miss' };
  }

  async _checkIfShipSunk(shipId) {
    const result = await this.db.get(`SELECT COUNT(*) AS remaining FROM ship_coordinates WHERE ship_id = ? AND is_hit = 0`, [shipId]);
    if (result.remaining === 0) {
      await this.db.run(`UPDATE ships SET is_sunk = 1 WHERE id = ?`, [shipId]);
      return { isSunk: true };
    }
    return { isSunk: false };
  }

  async switchTurn(gameId, currentTurn) {
    const nextTurn = currentTurn === 'player' ? 'computer' : 'player';
    await this.db.run(`UPDATE games SET turn = ? WHERE id = ?`, [nextTurn, gameId]);
  }

  async getCurrentGameState(gameId) {
    const game = await this.db.get(`SELECT * FROM games WHERE id = ?`, [gameId]);
    const ships = await this.db.all(`SELECT * FROM ships WHERE game_id = ?`, [gameId]);
    const shipCoords = await this.db.all(`SELECT * FROM ship_coordinates WHERE ship_id IN (SELECT id FROM ships WHERE game_id = ?)`, [gameId]);

    return { game, ships, coordinates: shipCoords };
  }
}

module.exports = GameRepository;
