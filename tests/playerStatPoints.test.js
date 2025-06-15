const { loadGame } = require('./helpers');
const assert = require('assert');

async function run() {
  const win = await loadGame();
  win.updateStats = () => {};
  win.updateSkillDisplay = () => {};
  win.addMessage = () => {};
  const { gameState, checkLevelUp, allocateStat } = win;

  gameState.player.exp = gameState.player.expNeeded;
  const before = gameState.player.statPoints;
  checkLevelUp();
  assert.strictEqual(gameState.player.statPoints, before + 5, 'stat points not gained');

  const beforeStr = gameState.player.strength;
  allocateStat('strength');
  assert.strictEqual(gameState.player.strength, beforeStr + 1, 'stat not increased');
  assert.strictEqual(gameState.player.statPoints, before + 4, 'stat points not spent');
}

run().catch(e => { console.error(e); process.exit(1); });
