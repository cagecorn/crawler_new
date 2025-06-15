const { loadGame } = require('./helpers');

async function run() {
  const win = await loadGame();
  win.updateStats = () => {};
  win.updateMercenaryDisplay = () => {};
  win.updateInventoryDisplay = () => {};
  win.renderDungeon = () => {};
  win.updateCamera = () => {};
  win.requestAnimationFrame = fn => fn();

  const { createMonster, killMonster, reviveMonsterCorpse, gameState } = win;
  const MONSTER_TRAITS = win.eval('MONSTER_TRAITS');
  const MONSTER_TRAIT_SETS = win.eval('MONSTER_TRAIT_SETS');

  const size = 3;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
  gameState.player.x = 0;
  gameState.player.y = 0;
  gameState.player.gold = 1000;
  gameState.activeMercenaries = [];
  gameState.standbyMercenaries = [];
  gameState.monsters = [];
  gameState.corpses = [];
  gameState.items = [];

  const tests = [
    { type: 'ARCHER', level: 2 },
    { type: 'ORC', level: 3 }
  ];

  for (const { type, level } of tests) {
    const monster = createMonster(type, 1, 1, level);
    if (!monster.trait || !MONSTER_TRAIT_SETS[type].includes(monster.trait)) {
      console.error('monster trait not assigned');
      process.exit(1);
    }

    gameState.monsters.push(monster);
    gameState.dungeon[1][1] = 'monster';
    killMonster(monster);
    gameState.player.gold = 1000;
    reviveMonsterCorpse(monster);
    const merc = gameState.activeMercenaries.find(m => m.id === monster.id);
    if (!merc || merc.trait !== monster.trait) {
      console.error('monster trait not kept after revival');
      process.exit(1);
    }

    gameState.activeMercenaries = [];
    gameState.monsters = [];
    gameState.corpses = [];
  }
}

run().catch(e => { console.error(e); process.exit(1); });
