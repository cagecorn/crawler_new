const { loadGame } = require('./helpers');

async function run() {
  const win = await loadGame();
  win.updateStats = () => {};
  win.updateMercenaryDisplay = () => {};
  win.updateInventoryDisplay = () => {};
  win.renderDungeon = () => {};
  win.updateCamera = () => {};
  win.requestAnimationFrame = fn => fn();

  const {
    createMonster,
    createItem,
    killMonster,
    reviveMonsterCorpse,
    convertMonsterToMercenary,
    gameState
  } = win;

  // Basic dungeon setup
  const size = 3;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
  gameState.player.x = 0;
  gameState.player.y = 0;
  gameState.activeMercenaries = [];
  gameState.standbyMercenaries = [];
  gameState.monsters = [];
  gameState.corpses = [];
  gameState.items = [];

  // create and kill monster
  const monster = createMonster('GOBLIN', 1, 1, 1);
  gameState.monsters.push(monster);
  gameState.dungeon[1][1] = 'monster';
  killMonster(monster);

  if (!gameState.corpses.includes(monster)) {
    console.error('monster corpse not recorded');
    process.exit(1);
  }
  if (gameState.dungeon[1][1] !== 'corpse') {
    console.error('dungeon cell not marked as corpse');
    process.exit(1);
  }

  const expected = convertMonsterToMercenary(monster);
  gameState.player.gold = 1000;
  reviveMonsterCorpse(monster);
  const revived = gameState.activeMercenaries.find(m => m.id === monster.id);

  if (!revived) {
    console.error('mercenary not added on revival');
    process.exit(1);
  }
  if (revived.name !== expected.name || revived.level !== expected.level || revived.maxHealth !== expected.maxHealth) {
    console.error('corpse not converted properly');
    process.exit(1);
  }
  if (gameState.corpses.length !== 0) {
    console.error('corpse not removed after revival');
    process.exit(1);
  }
  if (gameState.dungeon[1][1] !== 'empty') {
    console.error('dungeon cell not cleared after revival');
    process.exit(1);
  }

  // second case: revival when item on cell
  const monster2 = createMonster('GOBLIN', 2, 1, 1);
  gameState.monsters.push(monster2);
  gameState.dungeon[1][2] = 'monster';
  killMonster(monster2);
  if (gameState.dungeon[1][2] !== 'corpse') {
    console.error('second corpse not recorded');
    process.exit(1);
  }
  const item = createItem('healthPotion', 2, 1);
  gameState.items.push(item);
  gameState.player.gold = 1000;
  reviveMonsterCorpse(monster2);
  if (!gameState.activeMercenaries.find(m => m.id === monster2.id)) {
    console.error('second mercenary not added');
    process.exit(1);
  }
  if (gameState.dungeon[1][2] !== 'item') {
    console.error('dungeon cell not updated to item after revival');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
