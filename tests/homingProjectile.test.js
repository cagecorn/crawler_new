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

  const { gameState, createMonster, createHomingProjectile, processProjectiles, getDistance } = win;

  const monster = createMonster('ZOMBIE', gameState.player.x + 3, gameState.player.y);
  gameState.monsters.push(monster);
  gameState.dungeon[monster.y][monster.x] = 'monster';
  gameState.dungeon[monster.y][monster.x - 1] = 'empty';
  gameState.dungeon[monster.y][monster.x - 2] = 'empty';

  const proj = createHomingProjectile(gameState.player.x, gameState.player.y, monster);

  let prevDist = getDistance(proj.x, proj.y, monster.x, monster.y);
  processProjectiles();
  let newDist = getDistance(proj.x, proj.y, monster.x, monster.y);
  if (newDist >= prevDist) {
    console.error('projectile did not move toward target');
    process.exit(1);
  }

  prevDist = newDist;
  processProjectiles();
  newDist = getDistance(proj.x, proj.y, monster.x, monster.y);
  if (newDist >= prevDist) {
    console.error('projectile did not continue homing');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
