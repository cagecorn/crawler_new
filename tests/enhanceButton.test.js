const { loadGame } = require('./helpers');

async function run() {
  const win = await loadGame();
  win.updateStats = () => {};
  win.updateMercenaryDisplay = () => {};
  win.renderDungeon = () => {};
  win.updateCamera = () => {};
  win.updateSkillDisplay = () => {};
  win.requestAnimationFrame = fn => fn();

  const { createItem, addToInventory, showItemDetailPanel } = win;

  const sword = createItem('shortSword', 0, 0);
  const potion = createItem('healthPotion', 0, 0);
  win.gameState.player.inventory = [];
  addToInventory(sword);
  addToInventory(potion);

  const container = win.document.getElementById('inventory-items');
  const items = container.querySelectorAll('.inventory-item');
  if (items.length !== 2) {
    console.error('unexpected item count');
    process.exit(1);
  }

  const weaponEnhance = items[0].querySelector('.enhance-button');
  if (weaponEnhance) {
    console.error('enhance button should not be in list');
    process.exit(1);
  }

  showItemDetailPanel(sword);
  const panel = win.document.getElementById('item-detail-panel');
  const detailEnhance = win.document.getElementById('item-detail-panel').querySelector('.enhance-button');
  if (!detailEnhance) {
    console.error('enhance button missing in detail panel');
    process.exit(1);
  }
  win.hideItemDetailPanel();
}

run().catch(e => { console.error(e); process.exit(1); });
