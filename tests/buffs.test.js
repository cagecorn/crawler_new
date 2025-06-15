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

  const { gameState, triggerProcSkill, processTurn, getStat } = win;
  const SKILL_DEFS = win.eval('SKILL_DEFS');
  SKILL_DEFS['TestBuff'] = { name: 'TestBuff', icon: '⭐', buff: { attack: 2 }, duration: 2 };

  const baseAtk = getStat(gameState.player, 'attack');
  triggerProcSkill(gameState.player, gameState.player, { skill: 'TestBuff' });
  if (!gameState.player.buffs || gameState.player.buffs.length !== 1) {
    console.error('buff not applied');
    process.exit(1);
  }
  if (getStat(gameState.player, 'attack') !== baseAtk + 2) {
    console.error('buff stat not applied');
    process.exit(1);
  }
  if (gameState.player.buffs[0].turnsLeft !== SKILL_DEFS['TestBuff'].duration) {
    console.error('duration incorrect');
    process.exit(1);
  }

  processTurn();
  if (gameState.player.buffs[0].turnsLeft !== SKILL_DEFS['TestBuff'].duration - 1) {
    console.error('duration not decremented');
    process.exit(1);
  }

  triggerProcSkill(gameState.player, gameState.player, { skill: 'TestBuff' });
  if (gameState.player.buffs.length !== 1 || gameState.player.buffs[0].turnsLeft !== SKILL_DEFS['TestBuff'].duration) {
    console.error('buff not refreshed');
    process.exit(1);
  }

  processTurn();
  processTurn();
  if (gameState.player.buffs.length !== 0) {
    console.error('buff not expired');
    process.exit(1);
  }
  if (getStat(gameState.player, 'attack') !== baseAtk) {
    console.error('stat not restored');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
