const { loadGame } = require('./helpers');

async function run() {
  const win = await loadGame();
  win.updateStats = () => {};
  win.updateMercenaryDisplay = () => {};
  win.updateInventoryDisplay = () => {};
  win.renderDungeon = () => {};
  win.updateCamera = () => {};
  win.requestAnimationFrame = fn => fn();

  const { createMonster, hireMercenary, monsterAttack, gameState } = win;

  const size = 5;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
  gameState.player.x = 2;
  gameState.player.y = 2;

  gameState.player.gold = 1000;
  hireMercenary('WARRIOR');
  const merc = gameState.activeMercenaries[0];
  merc.x = 3;
  merc.y = 2;
  merc.health = 1;
  merc.level = 2;

  const monster = createMonster('GOBLIN', 4, 2, 1);
  gameState.monsters = [monster];
  gameState.dungeon[monster.y][monster.x] = 'monster';

  const origRoll = win.rollDice;
  win.rollDice = notation => notation.includes('d20') ? 20 : 4;
  const origRandom = win.Math.random;
  win.Math.random = () => 0.99; // ensure hit
  monsterAttack(monster);
  win.Math.random = origRandom;
  win.rollDice = origRoll;

  if (monster.level < 2) {
    console.error('monster did not gain experience from kill');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
