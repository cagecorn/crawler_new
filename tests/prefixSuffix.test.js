const { loadGame } = require('./helpers');

async function run() {
  const win = await loadGame();
  win.updateStats = () => {};
  win.updateMercenaryDisplay = () => {};
  win.updateInventoryDisplay = () => {};
  win.renderDungeon = () => {};
  win.updateCamera = () => {};
  win.requestAnimationFrame = fn => fn();

  const { createItem, formatItem, PREFIXES, SUFFIXES } = win;

  const seq = [0, 0, 0.42, 0, 0.25];
  const origRandom = win.Math.random;
  win.Math.random = () => seq.shift() ?? origRandom();

  const item = createItem('shortSword', 0, 0);

  win.Math.random = origRandom;

  if (item.prefix !== 'Refreshing' || item.suffix !== 'of Wisdom') {
    console.error('prefix or suffix not applied');
    process.exit(1);
  }
  if (item.healthRegen !== 1 || item.manaRegen !== 1) {
    console.error('modifiers not applied');
    process.exit(1);
  }
  const desc = formatItem(item);
  if (!desc.includes('HP회복+') || !desc.includes('MP회복+')) {
    console.error('formatItem missing regen info');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
