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

  const {
    hireMercenary,
    tryApplyStatus,
    processMercenaryTurn,
    gameState,
    getStat
  } = win;
  const MERCENARY_SKILLS = win.eval('MERCENARY_SKILLS');

  // build basic empty dungeon
  const size = 5;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
  gameState.monsters = [];
  gameState.activeMercenaries = [];
  gameState.player.x = 2;
  gameState.player.y = 2;
  gameState.dungeon[2][2] = 'empty';

  // hire healer
  gameState.player.gold = 500;
  hireMercenary('HEALER');
  const healer = gameState.activeMercenaries[0];

  // ensure full mana
  healer.mana = healer.maxMana;
  const beforeMana = healer.mana;

  // apply poison to player
  const origRandom = win.Math.random;
  win.Math.random = () => 0; // guarantee status application
  tryApplyStatus(gameState.player, 'poison', 1);
  win.Math.random = origRandom;

  if (!gameState.player.poison) {
    console.error('status did not apply');
    process.exit(1);
  }

  const purifyCost = MERCENARY_SKILLS['Purify'].manaCost;

  processMercenaryTurn(healer, gameState.monsters);

  if (gameState.player.poison || healer.mana !== beforeMana - purifyCost) {
    console.error('purify did not remove status or mana cost incorrect');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
