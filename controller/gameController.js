const express = require('express');
const GameService = require('../service/gameService'); 

const router = express.Router();
const GameRepository = require('../repository/gameRepository');
const gameRepo = new GameRepository();
const gameService = new GameService(gameRepo);

router.post('/start', async (req, res) => {
  try {
    const gameId = await gameService.startNewGame();
    res.status(201).json({ gameId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:gameId/shot', async (req, res) => {
  const { gameId } = req.params;
  const { player, row, col } = req.body;

  try {
    const { playerResult, computerResult } = await gameService.takeShot(gameId, player, row, col);
    res.status(200).json({
      playerResult,
      computerResult
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:gameId/state', async (req, res) => {
  const { gameId } = req.params;

  try {
    const gameState = await gameService.getGameState(gameId);
    res.status(200).json(gameState);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
