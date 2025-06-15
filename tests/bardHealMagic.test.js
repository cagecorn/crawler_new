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

  const { createMercenary, healTarget, gameState, getStat } = win;

  gameState.player.health = 10;
  const bard = createMercenary('BARD', 1, 1);
  assert.strictEqual(bard.skill2, 'Heal', 'Bard should start with Heal as skill2');
  bard.intelligence = 5;
  const expected = Math.min(getStat(bard, 'magicPower'), getStat(gameState.player, 'maxHealth') - gameState.player.health);
  healTarget(bard, gameState.player);
  assert.strictEqual(gameState.player.health, 10 + expected, 'Bard heal should scale with magic power only');
}

run().catch(e => { console.error(e); process.exit(1); });
