const { loadGame: loadGameHelper } = require('./helpers');

async function run() {
  const win = await loadGameHelper();
  win.updateStats = () => {};
  win.updateMercenaryDisplay = () => {};
  win.updateInventoryDisplay = () => {};
  win.renderDungeon = () => {};
  win.updateCamera = () => {};
  win.requestAnimationFrame = fn => fn();

  const { hireMercenary, gameState, checkMercenaryLevelUp, showMercenaryDetails, saveGame, loadGame: loadGameGame, localStorage } = win;

  gameState.player.gold = 500;
  hireMercenary('WARRIOR');
  const merc = gameState.activeMercenaries[0];

  const total = Object.values(merc.stars).reduce((a,b)=>a+b,0);
  if (total > 9) {
    console.error('star total exceeds 9');
    process.exit(1);
  }

  showMercenaryDetails(merc);
  const html = win.document.getElementById('mercenary-detail-content').innerHTML;
  if (!html.includes('⭐'.repeat(merc.stars.strength))) {
    console.error('stars not shown in details');
    process.exit(1);
  }

  merc.stars = { strength: 2, agility: 0, endurance: 0, focus: 0, intelligence: 0 };
  const prev = merc.strength;
  merc.exp = merc.expNeeded;
  checkMercenaryLevelUp(merc);
  const expected = prev + 1 + merc.stars.strength * 0.5;
  if (merc.strength !== expected) {
    console.error('star growth not applied');
    process.exit(1);
  }

  delete merc.stars;
  saveGame();
  loadGameGame();
  const loaded = gameState.activeMercenaries[0];
  const loadSum = Object.values(loaded.stars).reduce((a,b)=>a+b,0);
  if (loadSum > 9) {
    console.error('stars invalid after load');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
