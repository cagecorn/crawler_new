const { loadGame } = require('./helpers');

async function run() {
  const win = await loadGame();
  win.updateStats = () => {};
  win.updateMercenaryDisplay = () => {};
  win.updateInventoryDisplay = () => {};
  win.renderDungeon = () => {};
  win.updateCamera = () => {};
  win.requestAnimationFrame = fn => fn();

  const { createMercenary, createItem, movePlayer, gameState } = win;

  const size = 3;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
  gameState.monsters = [];
  gameState.items = [];
  gameState.activeMercenaries = [];

  gameState.player.x = 1;
  gameState.player.y = 1;

  const item = createItem('shortSword', 2, 1);
  gameState.items.push(item);
  gameState.dungeon[1][2] = 'item';

  const merc = createMercenary('WARRIOR', 2, 1);
  gameState.activeMercenaries.push(merc);

  movePlayer(1, 0);

  if (!gameState.player.inventory.includes(item)) {
    console.error('item not added to inventory');
    process.exit(1);
  }
  if (gameState.items.length !== 0) {
    console.error('item not removed from items list');
    process.exit(1);
  }
  if (merc.x !== 1 || merc.y !== 1) {
    console.error('mercenary did not swap with player');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
