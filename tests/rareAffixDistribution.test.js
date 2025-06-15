const { loadGame } = require('./helpers');

async function run() {
  const win = await loadGame();
  win.updateStats = () => {};
  win.updateMercenaryDisplay = () => {};
  win.updateInventoryDisplay = () => {};
  win.renderDungeon = () => {};
  win.updateCamera = () => {};
  win.requestAnimationFrame = fn => fn();

  const { createItem, RARE_PREFIXES, RARE_SUFFIXES } = win;
  const seq = [];
  for (let i = 0; i < RARE_PREFIXES.length; i++) {
    seq.push(0); // id generation
    seq.push((i + 0.01) / RARE_PREFIXES.length); // prefix selection
    seq.push((i + 0.01) / RARE_SUFFIXES.length); // suffix selection
  }
  seq.push(0); // final safety value
  const origRandom = win.Math.random;
  win.Math.random = () => seq.shift() ?? origRandom();

  for (let i = 0; i < RARE_PREFIXES.length; i++) {
    const item = createItem('shortSword', 0, 0, null, 0, true);
    if (item.rarity !== 'rare' || item.prefix !== RARE_PREFIXES[i].name || item.suffix !== RARE_SUFFIXES[i].name) {
      console.error('rare affix not applied correctly');
      process.exit(1);
    }
  }
  win.Math.random = origRandom;
}

run().catch(e => { console.error(e); process.exit(1); });
