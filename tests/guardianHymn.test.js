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

  const { gameState, createMercenary, createMonster, assignSkill, skill1Action, applyShield, getStat } = win;
  const SKILL_DEFS = win.eval('SKILL_DEFS');

  gameState.player.skills.push('GuardianHymn');
  assignSkill(1, 'GuardianHymn');

  const merc = createMercenary('WARRIOR', gameState.player.x + 1, gameState.player.y);
  gameState.activeMercenaries.push(merc);

  // create enemy adjacent
  const monster = createMonster('GOBLIN', gameState.player.x - 1, gameState.player.y, 1);
  gameState.monsters.push(monster);

  gameState.player.intelligence = 5;
  gameState.player.mana = 10;
  skill1Action();

  const expected = Math.floor(getStat(gameState.player, 'magicPower'));
  if (gameState.player.shield <= 0 || merc.shield <= 0) {
    console.error('shield not applied');
    process.exit(1);
  }
  if (gameState.player.shieldTurns !== SKILL_DEFS['GuardianHymn'].duration - 1) {
    console.error('duration incorrect');
    process.exit(1);
  }

  // enemy should not receive shield if targeted directly
  if (applyShield(gameState.player, monster, SKILL_DEFS['GuardianHymn'])) {
    console.error('enemy received shield');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
