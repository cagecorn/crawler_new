const { loadGame } = require('./helpers');

async function run() {
  const win = await loadGame();
  win.updateMaterialsDisplay = () => {};
  win.updateInventoryDisplay = () => {};
  win.addMessage = () => {};
  const { createItem, addToInventory, enhanceItem, gameState } = win;

  const sword = createItem('shortSword', 0, 0);
  addToInventory(sword);

  gameState.materials.iron = 1;
  gameState.materials.bone = 1;

  enhanceItem(sword);

  if (sword.enhanceLevel !== 1) {
    console.error('enhance level not incremented');
    process.exit(1);
  }
  if (sword.attack !== sword.baseStats.attack + 1) {
    console.error('stats not increased');
    process.exit(1);
  }
  if (gameState.materials.iron !== 0 || gameState.materials.bone !== 0) {
    console.error('materials not consumed');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
