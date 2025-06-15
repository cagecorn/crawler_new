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
    createMercenary,
    createMonster,
    processMercenaryTurn,
    gameState
  } = win;
  const PARTY_LEASH_RADIUS = win.eval('PARTY_LEASH_RADIUS');

  const size = PARTY_LEASH_RADIUS + 5;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
  gameState.monsters = [];
  gameState.activeMercenaries = [];
  gameState.player.x = 0;
  gameState.player.y = 0;
  gameState.dungeon[0][0] = 'empty';

  const bard = createMercenary('BARD', 1, 0);
  gameState.activeMercenaries.push(bard);

  const monster = createMonster('GOBLIN', PARTY_LEASH_RADIUS + 2, 0, 1);
  monster.alive = true;
  gameState.monsters.push(monster);
  gameState.dungeon[monster.y][monster.x] = 'monster';

  const startX = bard.x;
  const startY = bard.y;

  processMercenaryTurn(bard, gameState.monsters);

  if (bard.x !== startX || bard.y !== startY) {
    console.error('bard moved toward distant monster');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
