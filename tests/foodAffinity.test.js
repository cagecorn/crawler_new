const { loadGame } = require('./helpers');
const assert = require('assert');

async function run() {
  const win = await loadGame();
  // stub out ui functions
  win.updateStats = () => {};
  win.updateMercenaryDisplay = () => {};
  win.updateInventoryDisplay = () => {};
  win.renderDungeon = () => {};
  win.updateCamera = () => {};
  win.updateSkillDisplay = () => {};
  win.requestAnimationFrame = fn => fn();

  const { hireMercenary, createItem, addToInventory, handleItemClick, gameState } = win;

  gameState.player.gold = 500;
  hireMercenary('WARRIOR');
  const merc = gameState.activeMercenaries[0];

  const meal = createItem('cookedMeal', 0, 0);
  addToInventory(meal);

  const beforeAffinity = merc.affinity;
  const beforeFullness = merc.fullness || 0;
  const invBefore = gameState.player.inventory.length;

  win.prompt = () => '1';
  handleItemClick(meal);

  assert.strictEqual(merc.affinity, beforeAffinity + 5, 'affinity did not increase');
  assert.strictEqual(merc.fullness, beforeFullness + 5, 'fullness did not increase');
  assert.strictEqual(gameState.player.inventory.length, invBefore - 1, 'meal not removed');
}

run().catch(e => { console.error(e); process.exit(1); });
