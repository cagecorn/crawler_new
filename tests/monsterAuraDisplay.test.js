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

  const { createEliteMonster, gameState, updateUnitEffectIcons } = win;
  const SKILL_DEFS = win.eval('SKILL_DEFS');

  const size = 3;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
  gameState.player.x = 1;
  gameState.player.y = 1;

  const origRandom = win.Math.random;
  win.Math.random = () => 0; // select first aura skill
  const monster = createEliteMonster('GOBLIN', 2, 1, 1);
  win.Math.random = origRandom;

  gameState.monsters = [monster];
  gameState.dungeon[1][2] = 'monster';
  monster.alive = true;

  const cellDiv = win.document.createElement('div');
  updateUnitEffectIcons(monster, cellDiv);

  const buffContainer = cellDiv.querySelector('.buff-container');
  const icon = SKILL_DEFS[monster.auraSkill].icon;
  if (buffContainer) {
    console.error('monster aura icon should not display');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
