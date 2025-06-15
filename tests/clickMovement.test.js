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
  win.setTimeout = fn => fn();
  win.showMonsterDetails = () => {};
  win.showMercenaryDetails = () => {};

  const { gameState, handleDungeonClick } = win;

  const startX = gameState.player.x;
  const startY = gameState.player.y;
  for (let i = 1; i <= 3; i++) {
    gameState.dungeon[startY][startX + i] = 'empty';
  }
  gameState.monsters = [];

  const cell = { dataset: { x: String(startX + 3), y: String(startY) }, closest: () => cell };
  handleDungeonClick({ target: cell });

  if (gameState.player.x !== startX + 3 || gameState.player.y !== startY) {
    console.error('player did not move to clicked tile');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
