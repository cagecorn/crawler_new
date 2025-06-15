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

  const { assignSkill, createMonster, getStat, gameState } = win;

  gameState.dungeonSize = 3;
  gameState.dungeon = Array.from({ length: 3 }, () => Array(3).fill('empty'));
  gameState.player.x = 1;
  gameState.player.y = 1;

  const monster = createMonster('GOBLIN', 2, 1, 1);
  gameState.monsters.push(monster);
  gameState.dungeon[1][2] = 'monster';

  assignSkill(1, 'ProtectAura');

  const base = getStat(monster, 'defense');
  if (getStat(monster, 'defense') !== base) {
    console.error('player aura affected enemy');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
