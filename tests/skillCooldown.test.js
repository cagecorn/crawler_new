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

  const { assignSkill, skill1Action, createMonster, processTurn, gameState } = win;
  const SKILL_DEFS = win.eval('SKILL_DEFS');

  const size = 3;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
  gameState.player.x = 1;
  gameState.player.y = 1;
  gameState.monsters = [];

  const monster = createMonster('ZOMBIE', 2, 1);
  gameState.monsters.push(monster);
  gameState.dungeon[monster.y][monster.x] = 'monster';

  gameState.player.skills.push('Fireball');
  assignSkill(1, 'Fireball');

  gameState.player.mana = 10;
  skill1Action();
  if (gameState.player.skillCooldowns['Fireball'] !== SKILL_DEFS['Fireball'].cooldown - 1) {
    console.error('cooldown not set correctly');
    process.exit(1);
  }

  processTurn();
  if (gameState.player.skillCooldowns['Fireball'] !== 0) {
    console.error('cooldown not decremented by processTurn');
    process.exit(1);
  }

  const beforeProj = gameState.projectiles.length;
  skill1Action();
  if (gameState.player.skillCooldowns['Fireball'] !== SKILL_DEFS['Fireball'].cooldown - 1) {
    console.error('cooldown not reset on reuse');
    process.exit(1);
  }
  if (gameState.projectiles.length !== beforeProj + 1) {
    console.error('skill should fire when off cooldown');
    process.exit(1);
  }

  const beforeProj2 = gameState.projectiles.length;
  const beforeMana2 = gameState.player.mana;
  skill1Action();
  if (gameState.projectiles.length !== beforeProj2 || beforeMana2 !== gameState.player.mana) {
    console.error('skill should not activate while on cooldown');
    process.exit(1);
  }
  if (gameState.player.skillCooldowns['Fireball'] !== 0) {
    console.error('cooldown not decremented after blocked use');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
