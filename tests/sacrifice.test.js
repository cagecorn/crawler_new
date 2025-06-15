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

  const { gameState, showMercenaryDetails, sacrifice, useItemOnTarget } = win;

  const merc = gameState.standbyMercenaries.find(m => m.name.includes('좀비'));
  assert(merc, 'starting zombie mercenary missing');
  assert.strictEqual(merc.affinity, 195, 'starting affinity not set');

  const meals = gameState.player.inventory.filter(i => i.key === 'cookedMeal');
  assert.strictEqual(meals.length, 5, 'starting cooked meals missing');

  merc.affinity = 200;
  showMercenaryDetails(merc);
  const html = win.document.getElementById('mercenary-detail-content').innerHTML;
  assert(html.includes('희생'), 'sacrifice button not shown');

  const origRandom = win.Math.random;
  win.Math.random = () => 0;
  win.confirm = () => true;
  const invBefore = gameState.player.inventory.length;
  sacrifice(merc);
  win.Math.random = origRandom;

  assert(!gameState.activeMercenaries.includes(merc), 'mercenary not removed');
  assert.strictEqual(gameState.player.inventory.length, invBefore + 1, 'essence not added');
  const essence = gameState.player.inventory[gameState.player.inventory.length - 1];
  assert.strictEqual(essence.key, 'strengthEssence', 'wrong essence type');

  const strBefore = gameState.player.strength;
  useItemOnTarget(essence, gameState.player);
  assert.strictEqual(gameState.player.strength, strBefore + 1, 'essence not applied');
}

run().catch(e => { console.error(e); process.exit(1); });
