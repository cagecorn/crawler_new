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

  // simulate bug: detail panel not shown
  win.showMonsterDetails = () => {};

  updateIncubatorDisplay();

  const waiting = win.document.getElementById('hatched-list');
  const entry = waiting.firstElementChild;
  if (!entry) {
    console.error('hatched entry missing');
    process.exit(1);
  }

  entry.click();

  if (gameState.hatchedSuperiors.length !== 1) {
    console.error('hatched monster removed unexpectedly');
    process.exit(1);
  }
  const log = win.document.getElementById('message-log');
  if (log.lastElementChild) {
    console.error('unexpected message');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
