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

  win.showAuraDetails('MightAura', 2);

  if (alerted !== 'Might Aura : attack +2, magicPower +2') {
    console.error('showAuraDetails output mismatch');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
