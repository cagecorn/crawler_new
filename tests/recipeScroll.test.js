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

  const { createRecipeScroll, pickUpAction, gameState } = win;

  const size = 3;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
  gameState.items = [];
  gameState.player.x = 1;
  gameState.player.y = 1;

  const scroll1 = createRecipeScroll('breadSoup', 1, 1);
  gameState.items.push(scroll1);
  gameState.dungeon[1][1] = 'item';

  pickUpAction();

  assert(gameState.knownRecipes.includes('breadSoup'), 'recipe not learned');
  assert(!gameState.player.inventory.some(i => i.id === scroll1.id), 'scroll not consumed');

  const lenAfterFirst = gameState.knownRecipes.length;

  const scroll2 = createRecipeScroll('breadSoup', 1, 1);
  gameState.items.push(scroll2);
  gameState.dungeon[1][1] = 'item';

  pickUpAction();

  assert.strictEqual(gameState.knownRecipes.length, lenAfterFirst, 'recipe duplicated');
}

run().catch(e => { console.error(e); process.exit(1); });
