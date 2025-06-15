const { loadGame } = require('./helpers');

async function run() {
  const win = await loadGame();
  win.updateStats = () => {};
  win.updateMercenaryDisplay = () => {};
  win.updateInventoryDisplay = () => {};
  win.renderDungeon = () => {};
  win.updateCamera = () => {};
  win.requestAnimationFrame = fn => fn();

  const { createItem, formatItem, RARE_PREFIXES, RARE_SUFFIXES } = win;
  const origRandom = win.Math.random;
  win.Math.random = () => 0;
  const item = createItem('shortSword', 0, 0, null, 0, true);
  win.Math.random = origRandom;

  if (item.rarity !== 'rare') {
    console.error('rarity flag missing');
    process.exit(1);
  }
  if (item.prefix !== RARE_PREFIXES[0].name || item.suffix !== RARE_SUFFIXES[0].name) {
    console.error('rare affixes not applied');
    process.exit(1);
  }
  const desc = formatItem(item);
  if (!desc.includes('class="rare"')) {
    console.error('rare formatting missing');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
