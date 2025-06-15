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

  const { gameState, createMonster, updateIncubatorDisplay } = win;

  const mon = createMonster('ZOMBIE', 0, 0);
  gameState.hatchedSuperiors.push(mon);
  updateIncubatorDisplay();

  const waiting = win.document.getElementById('hatched-list');
  const entry = waiting.firstElementChild;
  if (!entry) {
    console.error('hatched monster entry missing');
    process.exit(1);
  }

  entry.click();
  const panel = win.document.getElementById('monster-detail-panel');
  if (panel.style.display !== 'block') {
    console.error('detail panel not shown');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
