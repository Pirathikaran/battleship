class GameService {
  constructor(gameRepo) {
    this.gameRepo = gameRepo;
    this.playerShots = new Set(); 
    this.computerShots = new Set();
  }

  async startNewGame() {
    const gameId = await this.gameRepo.createGame();
    const playerShips = this.placeShips();
    const computerShips = this.placeShips();

    await this.gameRepo.saveShips(gameId, "player", playerShips);
    await this.gameRepo.saveShips(gameId, "computer", computerShips);

    return gameId;
  }

  placeShips() {
    const shipTypes = [
      { type: "battleship", size: 5 },
      { type: "destroyer", size: 4 },
      { type: "destroyer", size: 4 },
    ];

    const ships = [];

    for (const ship of shipTypes) {
      let placed = false;
      while (!placed) {
        const orientation = Math.random() < 0.5 ? "horizontal" : "vertical";
        const startRow = Math.floor(Math.random() * 10) + 1;
        const startCol = Math.floor(Math.random() * 10) + 1;

        if (
          this.isValidPlacement(
            ships,
            ship.size,
            startRow,
            startCol,
            orientation
          )
        ) {
          ships.push({
            type: ship.type,
            size: ship.size,
            orientation,
            startRow,
            startCol,
          });
          placed = true;
        }
      }
    }

    return ships;
  }

  isValidPlacement(ships, size, startRow, startCol, orientation) {
    if (orientation === "horizontal") {
      if (startCol + size - 1 > 10) return false;
      for (let col = startCol; col < startCol + size; col++) {
        if (this.isOccupied(ships, startRow, col)) return false;
      }
    } else {
      if (startRow + size - 1 > 10) return false;
      for (let row = startRow; row < startRow + size; row++) {
        if (this.isOccupied(ships, row, startCol)) return false;
      }
    }
    return true;
  }

  isOccupied(ships, row, col) {
    return ships.some((ship) => {
      const { size, startRow, startCol, orientation } = ship;
      if (orientation === "horizontal") {
        return row === startRow && col >= startCol && col < startCol + size;
      } else {
        return col === startCol && row >= startRow && row < startRow + size;
      }
    });
  }

  async takeShot(gameId, player, row, col) {
    const shotKey = `${row},${col}`;
    if (player === "player") {
      if (this.playerShots.has(shotKey)) {
        throw new Error("Location already hit. Choose a different target.");
      }
      this.playerShots.add(shotKey);
    } else {
      if (this.computerShots.has(shotKey)) {
        throw new Error("Location already hit by computer.");
      }
      this.computerShots.add(shotKey);
    }
    let status = "";

    const playerResult = await this.gameRepo.recordShot(
      gameId,
      player,
      row,
      col
    );
    const gameState = await this.gameRepo.getCurrentGameState(gameId);

    await this.gameRepo.switchTurn(gameId, gameState.game.turn);

    if (playerResult.hit) {
      const playerShips = await this.gameRepo.getCurrentGameState(gameId);
      if (this.allShipsSunk(playerShips.ships)) {
        await this.gameRepo.db.run(
          `UPDATE games SET state = 'finished' WHERE id = ?`,
          [gameId]
        );
        status = "Player has won!";
        return {
          playerResult: { hit: playerResult.hit, row, col, message },
          computerResult: null,
        };
      }
    }

    const computerResult = await this.computerPlay(gameId);

    const finalGameState = await this.gameRepo.getCurrentGameState(gameId);
    if (finalGameState.game.state === "finished") {
      status = "Computer has won!";
    }

    return {
      playerResult: {
        result: {
          hit: playerResult.hit,
          message: playerResult.message,
          shipSunk: playerResult.shipSunk,
        },
        col,
        row,
      },
      computerResult,
      status,
    };
  }

  allShipsSunk(ships) {
    return ships.every((ship) => ship.is_sunk === 1);
  }

  async computerPlay(gameId) {
    let shotTaken = false;
    let result;
    let raw;
    let col;

    while (!shotTaken) {
      const [randomRow, randomCol] = this.getRandomCoordinates();
      const shotKey = `${randomRow},${randomCol}`;

      if (!this.computerShots.has(shotKey)) {
        this.computerShots.add(shotKey);
        raw = randomRow;
        col = randomCol;
        result = await this.gameRepo.recordShot(
          gameId,
          "computer",
          randomRow,
          randomCol
        );
        shotTaken = true;
      }
    }

    await this.gameRepo.switchTurn(gameId, "computer");

    return { result, col, raw };
  }

  getRandomCoordinates() {
    const row = Math.floor(Math.random() * 10) + 1; 
    const col = Math.floor(Math.random() * 10) + 1; 
    return [row, col];
  }

  async getGameState(gameId) {
    return await this.gameRepo.getCurrentGameState(gameId);
  }
}

module.exports = GameService;
