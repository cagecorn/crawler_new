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

  const size = 3;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('wall'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
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
  if (item.x !== 1 || item.y !== 1) {
    console.error('item not on corpse tile');
    process.exit(1);
  }
  if (gameState.dungeon[1][1] !== 'item') {
    console.error('corpse tile not marked item');
    process.exit(1);
  }
  if (!gameState.corpses.includes(champ)) {
    console.error('corpse not recorded');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
