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
  const { createItem, addToInventory, confirmAndSell, gameState } = win;

  gameState.player.inventory = [];

  const item1 = createItem('healthPotion', 0, 0);
  addToInventory(item1);
  win.confirm = () => false;
  confirmAndSell(item1);
  if (gameState.player.inventory.length !== 1) {
    console.error('item sold despite cancel');
    process.exit(1);
  }

  const item2 = createItem('healthPotion', 0, 0);
  addToInventory(item2);
  win.confirm = () => true;
  confirmAndSell(item2);
  if (gameState.player.inventory.length !== 1) {
    console.error('item not sold after confirm');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
