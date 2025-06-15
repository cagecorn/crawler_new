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

  const { hireMercenary, createItem, addToInventory, handleItemClick, gameState } = win;

  gameState.player.gold = 500;
  hireMercenary('WARRIOR');
  const merc = gameState.activeMercenaries[0];

  const meat = createItem('rawMeat', 0, 0);
  addToInventory(meat);

  const beforeAffinity = merc.affinity;
  const beforeFullness = merc.fullness || 0;
  const invBefore = gameState.player.inventory.length;

  win.prompt = () => '1';
  handleItemClick(meat);

  assert.strictEqual(merc.affinity, beforeAffinity + meat.affinityGain, 'affinity did not change correctly');
  assert.strictEqual(merc.fullness, beforeFullness + meat.fullnessGain, 'fullness did not change correctly');
  assert.strictEqual(gameState.player.inventory.length, invBefore - 1, 'meat not consumed');
}

run().catch(e => { console.error(e); process.exit(1); });
