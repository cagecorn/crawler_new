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

  const { gameState, assignSkill, skill1Action, movePlayer, createMonster } = win;
  const SKILL_DEFS = win.eval('SKILL_DEFS');

  gameState.player.skills.push('Fireball');
  assignSkill(1, 'Fireball');

  const monster = createMonster('ZOMBIE', gameState.player.x + 1, gameState.player.y);
  gameState.monsters.push(monster);
  gameState.dungeon[monster.y][monster.x] = 'monster';

  gameState.player.mana = 3;
  skill1Action();
  if (gameState.player.skillCooldowns['Fireball'] !== SKILL_DEFS['Fireball'].cooldown - 1) {
    console.error('skill cooldown not set after use');
    process.exit(1);
  }
  if (gameState.player.mana !== 0.5) {
    console.error('mana not used or regenerated correctly');
    process.exit(1);
  }

  movePlayer(1, 0);
  if (gameState.player.skillCooldowns['Fireball'] !== 0) {
    console.error('cooldown not decremented on turn');
    process.exit(1);
  }
  if (gameState.player.mana !== 1.0) {
    console.error('mana did not regenerate on turn');
    process.exit(1);
  }

  const before = gameState.projectiles.length;
  gameState.player.mana = 0;
  skill1Action();
  if (gameState.projectiles.length !== before) {
    console.error('skill should not fire without mana');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
