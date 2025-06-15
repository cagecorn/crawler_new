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

  const {
    gameState,
    createMonster,
    createHomingProjectile,
    processProjectiles,
    killMonster
  } = win;

  const monster = createMonster('ZOMBIE', gameState.player.x + 1, gameState.player.y);
  gameState.monsters.push(monster);
  gameState.dungeon[monster.y][monster.x] = 'monster';
  gameState.dungeon[monster.y][monster.x - 1] = 'empty';

  createHomingProjectile(gameState.player.x, gameState.player.y, monster);
  killMonster(monster);
  processProjectiles();

  if (gameState.projectiles.length !== 0) {
    console.error('projectile should be removed when target dies');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
