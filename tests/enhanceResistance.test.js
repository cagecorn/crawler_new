const { loadGame } = require('./helpers');

async function run() {
  const win = await loadGame();
  win.updateMaterialsDisplay = () => {};
  win.updateInventoryDisplay = () => {};
  win.addMessage = () => {};
  const { createItem, addToInventory, enhanceItem, gameState } = win;

  const item = createItem('shortSword', 0, 0, 'Poison Resistant');
  addToInventory(item);

  gameState.materials.iron = 1;
  gameState.materials.bone = 1;

  enhanceItem(item);

  if (item.enhanceLevel !== 1) {
    console.error('enhance level not incremented');
    process.exit(1);
  }
  const expected = item.baseStats.poisonResist + 0.01;
  if (Math.abs(item.poisonResist - expected) > 1e-9) {
    console.error('resistance stat not increased correctly');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
