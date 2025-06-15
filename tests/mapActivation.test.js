const { loadGame } = require('./helpers');
const assert = require('assert');

async function run() {
  const win = await loadGame();
  win.updateStats = () => {};
  win.updateMercenaryDisplay = () => {};
  win.updateInventoryDisplay = () => {};
  win.renderDungeon = () => {};
  win.updateCamera = () => {};
  win.updateSkillDisplay = () => {};
  win.requestAnimationFrame = fn => fn();

  const { gameState, createItem, useItem, nextFloor, generateDungeon } = win;
  gameState.floor = 5;
  generateDungeon();

  let ax = 0, ay = 0;
  outer: for (let y = 0; y < gameState.dungeonSize; y++) {
    for (let x = 0; x < gameState.dungeonSize; x++) {
      if (gameState.dungeon[y][x] === 'altar') { ax = x; ay = y; break outer; }
    }
  }
  gameState.player.x = ax;
  gameState.player.y = ay;

  const map = createItem('graveyardMap', 0, 0);
  map.modifiers = { goldMultiplier: 2 };
  gameState.player.inventory.push(map);

  useItem(map);

  assert.deepStrictEqual(gameState.pendingMap.modifiers, { goldMultiplier: 2 });

  nextFloor();

  assert.deepStrictEqual(gameState.currentMapModifiers, { goldMultiplier: 2 });
}

run().catch(e => { console.error(e); process.exit(1); });
