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

  const { createItem, addToInventory, handleItemClick, gameState } = win;

  const scroll = createItem('smallExpScroll', 0, 0);
  addToInventory(scroll);

  const beforeExp = gameState.player.exp;
  win.prompt = () => '0';
  handleItemClick(scroll);

  if (gameState.player.exp !== beforeExp + scroll.expGain) {
    console.error('exp not gained from scroll');
    process.exit(1);
  }
  if (gameState.player.inventory.some(i => i.id === scroll.id)) {
    console.error('scroll not consumed');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
