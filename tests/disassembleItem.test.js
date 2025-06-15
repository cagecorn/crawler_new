const { loadGame } = require('./helpers');

async function run() {
  const win = await loadGame();
  win.updateInventoryDisplay = () => {};
  win.updateMaterialsDisplay = () => {};
  win.addMessage = () => {};

  const { createItem, addToInventory, disassembleItem, gameState } = win;

  const sword = createItem('shortSword', 0, 0);
  gameState.player.inventory = [];
  addToInventory(sword);

  const beforeIron = gameState.materials.iron || 0;
  const beforeBone = gameState.materials.bone || 0;

  disassembleItem(sword);

  const qty = (sword.level || 1) + (sword.enhanceLevel || 0);
  if (gameState.player.inventory.length !== 0) {
    console.error('item not removed');
    process.exit(1);
  }
  if (gameState.materials.iron !== beforeIron + qty || gameState.materials.bone !== beforeBone + qty) {
    console.error('materials not granted');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
