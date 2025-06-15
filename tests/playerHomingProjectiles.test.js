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
    assignSkill,
    skill1Action,
    rangedAction,
    createMonster,
    processProjectiles,
    getDistance
  } = win;

  const size = 10;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
  gameState.monsters = [];
  gameState.player.x = 1;
  gameState.player.y = 1;
  gameState.dungeon[1][1] = 'empty';

  const monster = createMonster('ZOMBIE', gameState.player.x + 3, gameState.player.y);
  gameState.monsters.push(monster);
  gameState.dungeon[monster.y][monster.x] = 'monster';

  // Fireball homing
  gameState.player.skills.push('Fireball');
  assignSkill(1, 'Fireball');
  skill1Action();
  if (gameState.projectiles.length !== 1 || !gameState.projectiles[0].homing || gameState.projectiles[0].target !== monster) {
    console.error('fireball not homing');
    process.exit(1);
  }
  const prevDist = getDistance(gameState.projectiles[0].x, gameState.projectiles[0].y, monster.x, monster.y);
  processProjectiles();
  const newDist = getDistance(gameState.projectiles[0].x, gameState.projectiles[0].y, monster.x, monster.y);
  if (newDist >= prevDist) {
    console.error('fireball did not move toward target');
    process.exit(1);
  }

  // reset
  gameState.projectiles = [];

  // Iceball homing
  gameState.player.skills.push('Iceball');
  assignSkill(1, 'Iceball');
  skill1Action();
  if (gameState.projectiles.length !== 1 || !gameState.projectiles[0].homing || gameState.projectiles[0].target !== monster) {
    console.error('iceball not homing');
    process.exit(1);
  }

  gameState.projectiles = [];

  // Ranged attack homing
  rangedAction();
  if (gameState.projectiles.length !== 1 || !gameState.projectiles[0].homing || gameState.projectiles[0].target !== monster) {
    console.error('ranged attack not homing');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
