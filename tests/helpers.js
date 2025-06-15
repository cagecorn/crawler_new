const { rollDice } = require('../dice');
const { JSDOM } = require('jsdom');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

async function loadGame(options = {}) {
  const { confirmReturn = true, spawnPaladin = false } = options;
  const htmlPath = path.join(__dirname, '..', 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  html = html.replace(/<link rel="stylesheet" href="style.css">/, '');
  html = html.replace('<script src="dice.js"></script>', '');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'http://localhost',
    beforeParse(window) {
      window.rollDice = rollDice;
      window.confirm = () => confirmReturn;
      window.spawnPaladinTest = spawnPaladin;
    }
  });

  await new Promise(resolve => {
    if (dom.window.document.readyState === 'complete') resolve();
    else dom.window.addEventListener('load', resolve);
  });

  Object.defineProperty(dom.window, 'localStorage', {
    configurable: true,
    value: {
      _data: {},
      getItem(key) { return this._data[key] || null; },
      setItem(key, value) { this._data[key] = String(value); },
      removeItem(key) { delete this._data[key]; }
    }
  });

  const ctx = dom.getInternalVMContext();
  const modules = ['src/state.js', 'src/ui.js', 'src/mechanics.js'];
  for (const file of modules) {
    const code = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const script = new vm.Script(code, { filename: file });
    script.runInContext(ctx);
  }

  dom.window.generateStars = () => ({ strength: 0, agility: 0, endurance: 0, focus: 0, intelligence: 0 });

  return dom.window;
}

module.exports = { loadGame };
