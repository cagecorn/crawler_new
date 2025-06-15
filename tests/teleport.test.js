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

  const { gameState, useSkill } = win;

  const size = 5;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
  gameState.monsters = [];

  const startX = gameState.player.x;
  const startY = gameState.player.y;

  gameState.player.mana = 10;
  gameState.player.skillLevels.Teleport = 1;

  useSkill('Teleport');
  if (gameState.player.teleportSavedX !== startX || gameState.player.teleportSavedY !== startY) {
    console.error('location not saved');
    process.exit(1);
  }

  gameState.player.x = startX + 1;

  useSkill('Teleport');
  if (gameState.player.x !== startX || gameState.player.y !== startY) {
    console.error('did not teleport to saved location');
    process.exit(1);
  }

  useSkill('Teleport');
  if (gameState.player.x !== startX + 1 || gameState.player.y !== startY) {
    console.error('did not return to previous location');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
