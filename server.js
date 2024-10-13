const express = require('express');
const gameController = require('./controller/gameController'); 
const initDb = require('./db/connection');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json()); 

async function init() {
  try {
    app.locals.db = await initDb();
    console.log("Database initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize the database:", error);
    process.exit(1);
  }
}

init().then(() => {
  app.use('/api/games', gameController);
  
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
