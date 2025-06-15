const { loadGame } = require('./helpers');

async function run() {
  const win = await loadGame();
  win.updateStats = () => {};
  win.updateMercenaryDisplay = () => {};
  win.updateCamera = () => {};
  win.updateSkillDisplay = () => {};
  win.renderDungeon = () => {};
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

  const swordBtn = items[0].querySelector('.disassemble-button');
  if (swordBtn) {
    console.error('disassemble button should not be in list');
    process.exit(1);
  }

  showItemDetailPanel(sword);
  const detailBtn = win.document.getElementById('item-detail-panel').querySelector('.disassemble-button');
  if (!detailBtn) {
    console.error('disassemble button missing in detail panel');
    process.exit(1);
  }
  win.hideItemDetailPanel();
}

run().catch(e => { console.error(e); process.exit(1); });
