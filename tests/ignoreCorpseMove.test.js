const { loadGame } = require('./helpers');

async function run() {
  const win = await loadGame();
  win.updateStats = () => {};
  win.updateMercenaryDisplay = () => {};
  win.updateInventoryDisplay = () => {};
  win.renderDungeon = () => {};
  win.updateCamera = () => {};
  win.requestAnimationFrame = fn => fn();

  const { createMonster, killMonster, ignoreCorpse, processTurn, findAdjacentEmpty, gameState } = win;

  const size = 3;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
  gameState.monsters = [];
  gameState.corpses = [];
  gameState.items = [];

  gameState.player.x = 0;
  gameState.player.y = 1;

  const monster = createMonster('GOBLIN', 1, 1, 1);
  gameState.monsters.push(monster);
  gameState.dungeon[1][1] = 'monster';
  killMonster(monster);

  // ensure corpse recorded
  if (!gameState.corpses.includes(monster) || gameState.dungeon[1][1] !== 'corpse') {
    console.error('corpse not created');
    process.exit(1);
  }

  ignoreCorpse(monster);
  processTurn();

  const expected = findAdjacentEmpty(1, 1);
  if (gameState.player.x !== expected.x || gameState.player.y !== expected.y) {
    console.error('player not moved to adjacent empty tile');
    process.exit(1);
  }
  if (gameState.dungeon[1][1] !== 'empty') {
    console.error('corpse not removed after ignore');
    process.exit(1);
  }
  if (gameState.turn !== 1) {
    console.error('turn count should increase once');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
