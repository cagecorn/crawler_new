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

  const { hireMercenary, processMercenaryTurn, gameState, getStat } = win;

  const size = 5;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
  gameState.monsters = [];
  gameState.activeMercenaries = [];
  gameState.player.x = 2;
  gameState.player.y = 2;
  gameState.dungeon[2][2] = 'empty';

  gameState.player.gold = 500;
  hireMercenary('HEALER');
  const healer = gameState.activeMercenaries[0];
  healer.skill = 'Heal';
  healer.mana = healer.maxMana = 10;

  healer.health = getStat(healer, 'maxHealth') - 2;
  const beforeHealth = healer.health;
  const beforeMana = healer.mana;

  const origRandom = win.Math.random;
  win.Math.random = () => 0;
  processMercenaryTurn(healer, gameState.monsters);
  win.Math.random = origRandom;

  if (healer.health <= beforeHealth || healer.mana !== beforeMana - 2) {
    console.error('healer did not heal self');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
