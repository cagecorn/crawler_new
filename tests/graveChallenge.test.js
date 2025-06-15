const { loadGame } = require('./helpers');

async function run() {
  const win = await loadGame({ confirmReturn: true });
  win.updateStats = () => {};
  win.updateMercenaryDisplay = () => {};
  win.updateInventoryDisplay = () => {};
  win.renderDungeon = () => {};
  win.updateCamera = () => {};
  win.updateSkillDisplay = () => {};
  win.requestAnimationFrame = fn => fn();

  const { movePlayer, gameState } = win;

  const size = 3;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
  gameState.items = [];
  gameState.monsters = [];
  gameState.materials = { wood: 0, iron: 0, bone: 0 };
  gameState.player.gold = 0;
  gameState.player.x = 1;
  gameState.player.y = 1;

  gameState.dungeon[1][2] = 'grave';

  movePlayer(1, 0);

  if (gameState.dungeon[1][2] !== 'empty') {
    console.error('grave not cleared');
    process.exit(1);
  }
  if (gameState.items.length < 2) {
    console.error('items not dropped');
    process.exit(1);
  }
  if (gameState.monsters.length === 0) {
    console.error('monsters not spawned');
    process.exit(1);
  }
  if (gameState.player.gold <= 0) {
    console.error('gold not awarded');
    process.exit(1);
  }
  if (gameState.materials.wood <= 0 || gameState.materials.iron <= 0 || gameState.materials.bone <= 0) {
    console.error('materials not gained');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
