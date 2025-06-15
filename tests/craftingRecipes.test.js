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

  const { addRecipeToTab, removeRecipeFromTab, saveGame, loadGame: reloadGame, gameState, localStorage } = win;

  gameState.activeRecipes = ['healthPotion'];
  addRecipeToTab('sandwich');
  if (!gameState.activeRecipes.includes('sandwich')) {
    console.error('recipe not added');
    process.exit(1);
  }
  removeRecipeFromTab('healthPotion');
  if (gameState.activeRecipes.includes('healthPotion')) {
    console.error('recipe not removed');
    process.exit(1);
  }

  saveGame();
  const saved = JSON.parse(localStorage.getItem('dungeonCrawlerSave'));
  delete saved.activeRecipes;
  localStorage.setItem('dungeonCrawlerSave', JSON.stringify(saved));
  gameState.activeRecipes = [];
  reloadGame();
  if (JSON.stringify(gameState.activeRecipes) !== JSON.stringify(saved.knownRecipes)) {
    console.error('activeRecipes not restored from knownRecipes');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
