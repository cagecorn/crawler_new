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

  const { hireMercenary, createItem, addToInventory, handleItemClick, gameState } = win;

  gameState.player.gold = 500;
  hireMercenary('WARRIOR');
  const merc = gameState.activeMercenaries[0];

  const scroll = createItem('smallExpScroll', 0, 0);
  addToInventory(scroll);
  const beforeExp = merc.exp;

  win.prompt = () => '1';
  handleItemClick(scroll);

  if (merc.exp !== beforeExp + scroll.expGain) {
    console.error('prompt target selection failed');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
