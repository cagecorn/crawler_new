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

  const { createEliteMonster, showMonsterDetails, gameState } = win;
  const SKILL_DEFS = win.eval('SKILL_DEFS');

  const size = 3;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));

  const origRandom = win.Math.random;
  win.Math.random = () => 0;
  const mon = createEliteMonster('GOBLIN', 1, 1, 1);
  win.Math.random = origRandom;

  mon.poison = true;
  mon.poisonTurns = 2;

  showMonsterDetails(mon);
  const html = win.document.getElementById('monster-detail-content').innerHTML;
  const auraIcon = SKILL_DEFS[mon.auraSkill].icon;
  if (!html.includes(auraIcon) || !html.includes('☠️')) {
    console.error('effect details missing');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
