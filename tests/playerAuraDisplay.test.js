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

  const { gameState, assignSkill, updateTurnEffects, updateUnitEffectIcons } = win;
  const SKILL_DEFS = win.eval('SKILL_DEFS');

  // setup minimal dungeon and player position
  const size = 3;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
  gameState.player.x = 1;
  gameState.player.y = 1;

  // give player an aura skill
  assignSkill(1, 'MightAura');
  gameState.player.skillLevels['MightAura'] = 1;

  // update UI elements
  const cellDiv = win.document.createElement('div');
  updateUnitEffectIcons(gameState.player, cellDiv);
  updateTurnEffects();

  const buffContainer = cellDiv.querySelector('.buff-container');
  const icon = SKILL_DEFS['MightAura'].icon;
  if (buffContainer) {
    console.error('aura icon should not display on tile');
    process.exit(1);
  }

  const panel = win.document.getElementById('turn-effects');
  if (!panel.innerHTML.includes(icon)) {
    console.error('player aura icon missing in turn-effects');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
