const { loadGame } = require('./helpers');

async function run() {
  const win = await loadGame();
  win.updateStats = () => {};
  win.updateMercenaryDisplay = () => {};
  win.updateInventoryDisplay = () => {};
  win.renderDungeon = () => {};
  win.updateCamera = () => {};
  win.requestAnimationFrame = fn => fn();

  const { createMonster, killMonster, processTurn, gameState } = win;

  const size = 3;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
  gameState.player.x = 0;
  gameState.player.y = 0;
  gameState.monsters = [];
  gameState.corpses = [];
  gameState.items = [];

  const monster = createMonster('GOBLIN', 1, 1, 1);
  gameState.monsters.push(monster);
  gameState.dungeon[1][1] = 'monster';
  killMonster(monster);

  if (!gameState.corpses.includes(monster) || typeof monster.turnsLeft !== 'number') {
    console.error('corpse not recorded with turns');
    process.exit(1);
  }

  // corpses should remain even after many turns
  for (let i = 0; i < 100; i++) {
    processTurn();
  }

  if (!gameState.corpses.includes(monster)) {
    console.error('corpse disappeared unexpectedly');
    process.exit(1);
  }
  if (gameState.dungeon[1][1] !== 'corpse') {
    console.error('dungeon tile no longer marked corpse');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
