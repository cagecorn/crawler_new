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

  const { gameState, createMercenary, createMonster, assignSkill, skill1Action, applyAttackBuff, getStat } = win;
  const SKILL_DEFS = win.eval('SKILL_DEFS');

  gameState.player.skills.push('CourageHymn');
  assignSkill(1, 'CourageHymn');

  const merc = createMercenary('WARRIOR', gameState.player.x + 1, gameState.player.y);
  gameState.activeMercenaries.push(merc);

  const monster = createMonster('GOBLIN', gameState.player.x - 1, gameState.player.y, 1);
  gameState.monsters.push(monster);

  gameState.player.intelligence = 5;
  gameState.player.mana = 10;
  skill1Action();

  const expected = Math.floor(getStat(gameState.player, 'magicPower'));
  if (gameState.player.attackBuff !== expected || merc.attackBuff !== expected) {
    console.error('attack buff not applied');
    process.exit(1);
  }
  if (gameState.player.attackBuffTurns !== SKILL_DEFS['CourageHymn'].duration - 1) {
    console.error('duration incorrect');
    process.exit(1);
  }

  if (applyAttackBuff(gameState.player, monster, SKILL_DEFS['CourageHymn'])) {
    console.error('enemy received buff');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
