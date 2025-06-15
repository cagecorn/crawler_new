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

  let alerted = null;
  win.alert = msg => { alerted = msg; };

  const detail = 'damage roll 1 + attack 2 - defense 1 = 2';
  win.addMessage('test', 'info', detail);
  const log = win.document.getElementById('message-log');
  const msg = log.lastElementChild;
  if (!msg.dataset.detail || msg.dataset.detail !== detail) {
    console.error('detail attribute missing');
    process.exit(1);
  }
  msg.click();
  if (alerted !== detail) {
    console.error('detail click did not trigger alert');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
