const { loadGame } = require('./helpers');
const fs = require('fs');
const path = require('path');

async function run() {
  const win = await loadGame();
  // inject CSS so computed styles are available
  const styleEl = win.document.createElement('style');
  styleEl.textContent = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
  win.document.head.appendChild(styleEl);

  // override getActiveAuraIcons to return multiple icons
  win.getActiveAuraIcons = () => ['🔥', '🛡️', '❄️', '⚡', '💨'];

  const unit = {
    id: 'test-unit',
    poison: true, poisonTurns: 1,
    burn: true, burnTurns: 1,
    freeze: true, freezeTurns: 1,
    bleed: true, bleedTurns: 1
  };

  const div = win.document.createElement('div');
  div.style.width = '32px';
  div.style.height = '32px';
  div.style.position = 'relative';
  win.document.body.appendChild(div);

  win.updateUnitEffectIcons(unit, div);

  const buff = div.querySelector('.buff-container');
  const status = div.querySelector('.status-container');

  if (buff || status) {
    console.error('effect containers should not exist');
    process.exit(1);
  }

  console.log('no icon layout ok');
}

run().catch(e => { console.error(e); process.exit(1); });
