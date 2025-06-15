const { loadGame } = require('./helpers');

async function run() {
  const win = await loadGame();
  win.updateStats = () => {};
  win.updateMercenaryDisplay = () => {};
  win.updateInventoryDisplay = () => {};
  win.renderDungeon = () => {};
  win.updateCamera = () => {};
  win.requestAnimationFrame = fn => fn();

  const { createChampion, createItem, killMonster, gameState } = win;

  const champ = createChampion('ARCHER', 1, 1, 1);
  champ.equipped.weapon = createItem('shortSword', 0, 0);

  gameState.dungeonSize = 3;
  gameState.dungeon = Array.from({ length: 3 }, () => Array(3).fill('empty'));
  gameState.fogOfWar = Array.from({ length: 3 }, () => Array(3).fill(false));
  gameState.monsters = [champ];
  gameState.items = [];
  gameState.corpses = [];
  gameState.dungeon[1][1] = 'monster';

  killMonster(champ);

  if (gameState.items.length !== 1) {
    console.error('item not dropped');
    process.exit(1);
  }
  const item = gameState.items[0];
  const dx = Math.abs(item.x - 1);
  const dy = Math.abs(item.y - 1);
  if (dx === 0 && dy === 0) {
    console.error('item dropped on corpse');
    process.exit(1);
  }
  if (dx > 1 || dy > 1) {
    console.error('item not adjacent');
    process.exit(1);
  }
  if (gameState.dungeon[1][1] !== 'corpse') {
    console.error('corpse not recorded');
    process.exit(1);
  }
  if (gameState.dungeon[item.y][item.x] !== 'item') {
    console.error('drop cell not marked item');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
