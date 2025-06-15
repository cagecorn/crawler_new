const { loadGame } = require('./helpers');

async function run() {
  const win = await loadGame();

  // override visual methods
  win.updateStats = () => {};
  win.updateMercenaryDisplay = () => {};
  win.updateInventoryDisplay = () => {};
  win.renderDungeon = () => {};
  win.updateCamera = () => {};
  win.requestAnimationFrame = fn => fn();

  const { hireMercenary, movePlayer, saveGame, localStorage, gameState } = win;

  // ensure enough gold for hiring
  gameState.player.gold = 200;

  hireMercenary('WARRIOR');
  hireMercenary('ARCHER');

  saveGame();
  let state = JSON.parse(localStorage.getItem('dungeonCrawlerSave'));
  if (state.activeMercenaries.length !== 2) {
    console.error('expected 2 mercenaries');
    process.exit(1);
  }

  for (let i = 0; i < 3; i++) {
    movePlayer(1, 0);
  }

  saveGame();
  state = JSON.parse(localStorage.getItem('dungeonCrawlerSave'));
  const distances = state.activeMercenaries.map(m =>
    Math.abs(m.x - state.player.x) + Math.abs(m.y - state.player.y)
  );
  // console.log('distances from player:', distances.join(','));
  if (distances.some(d => d > 3)) {
    console.error('mercenary too far from player');
    process.exit(1);
  }

  // Scenario: pathfinding fails but direct movement is possible
  gameState.dungeonSize = 5;
  gameState.dungeon = Array.from({ length: 5 }, () => Array(5).fill('empty'));
  for (let y = 0; y < 5; y++) {
    gameState.dungeon[y][2] = 'wall';
  }
  gameState.player.x = 0;
  gameState.player.y = 2;

  const merc = gameState.activeMercenaries[0];
  gameState.activeMercenaries = [merc];
  merc.x = 4;
  merc.y = 2;
  merc.nextX = 4;
  merc.nextY = 2;

  win.processTurn();

  if (merc.x !== 3 || merc.y !== 2) {
    console.error('mercenary did not move directly toward player when path blocked');
    process.exit(1);
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
