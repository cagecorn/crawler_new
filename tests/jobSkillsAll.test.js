const { loadGame } = require('./helpers');

async function run() {
  const win = await loadGame();
  win.updateStats = () => {};
  win.updateMercenaryDisplay = () => {};
  win.updateInventoryDisplay = () => {};
  win.renderDungeon = () => {};
  win.updateCamera = () => {};
  win.updateSkillDisplay = () => {};
  win.requestAnimationFrame = fn => fn();

  const { startGame, gameState } = win;
  const SKILL_DEFS = win.eval('SKILL_DEFS');
  const keys = Object.keys(SKILL_DEFS);

  startGame();
  if (gameState.player.skills.length !== keys.length || !keys.every(k => gameState.player.skills.includes(k))) {
    console.error('startGame did not grant all skills');
    process.exit(1);
  }
  if (gameState.player.assignedSkills[1] !== keys[0] || gameState.player.assignedSkills[2] !== keys[1]) {
    console.error('skill slots not assigned correctly');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
