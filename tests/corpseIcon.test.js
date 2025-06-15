const { loadGame } = require('./helpers');

async function run() {
  const win = await loadGame();
  win.updateStats = () => {};
  win.updateMercenaryDisplay = () => {};
  win.updateInventoryDisplay = () => {};
  win.updateSkillDisplay = () => {};
  win.updateCamera = () => {};
  win.requestAnimationFrame = fn => fn();

  const {
    createMonster,
    killMonster,
    rebuildDungeonDOM,
    renderDungeon,
    gameState
  } = win;

  const size = 3;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));

  rebuildDungeonDOM();

  gameState.player.x = 0;
  gameState.player.y = 0;

  const monster = createMonster('ZOMBIE', 1, 1, 1);
  gameState.monsters.push(monster);
  gameState.dungeon[1][1] = 'monster';

  killMonster(monster);

  renderDungeon();

  const cell = gameState.cellElements[1][1];
  if (!cell.className.includes('corpse') || cell.textContent !== monster.icon) {
    console.error('corpse icon not rendered');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
