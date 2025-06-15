const { loadGame } = require('./helpers');

async function run() {
  const win = await loadGame();
  win.updateStats = () => {};
  win.updateMercenaryDisplay = () => {};
  win.updateInventoryDisplay = () => {};
  win.renderDungeon = () => {};
  win.updateCamera = () => {};
  win.requestAnimationFrame = fn => fn();

  const getMonsterPoolForFloor = win.getMonsterPoolForFloor;
  const MONSTER_SKILL_SETS = win.eval('MONSTER_SKILL_SETS');
  const MONSTER_TRAIT_SETS = win.eval('MONSTER_TRAIT_SETS');

  const expectations = [
    { floor: 1, pool: ['SLIME','GOBLIN','GOBLIN_ARCHER','ZOMBIE'] },
    { floor: 3, pool: ['KOBOLD','GOBLIN_WIZARD','SKELETON','ZOMBIE'] },
    { floor: 5, pool: ['GARGOYLE','SKELETON','SKELETON_MAGE','ORC'] },
    { floor: 7, pool: ['BANSHEE','ORC','ORC_ARCHER','TROLL'] },
    { floor: 9, pool: ['MINOTAUR','TROLL','ORC_ARCHER','DARK_MAGE'] },
    { floor: 11, pool: ['LICH','DARK_MAGE','TROLL','DEMON_WARRIOR'] },
    { floor: 13, pool: ['DRAGON_WHELP','DEMON_WARRIOR','DARK_MAGE','TROLL'] },
    { floor: 15, pool: ['ELEMENTAL_GOLEM','DEMON_WARRIOR','DARK_MAGE','TROLL'] },
    { floor: 17, pool: ['ELEMENTAL_GOLEM','DEMON_WARRIOR','MINOTAUR','DRAGON_WHELP'] },
    { floor: 19, pool: ['ELEMENTAL_GOLEM','DEMON_WARRIOR','DRAGON_WHELP','LICH'] }
  ];

  for (const { floor, pool } of expectations) {
    const result = getMonsterPoolForFloor(floor);
    if (JSON.stringify(result) !== JSON.stringify(pool)) {
      console.error('unexpected monster pool for floor', floor);
      process.exit(1);
    }
  }

  const newMonsters = [
    'GOBLIN_ARCHER','GOBLIN_WIZARD','ORC_ARCHER','SKELETON','SKELETON_MAGE','TROLL','DARK_MAGE','DEMON_WARRIOR',
    'SLIME','KOBOLD','GARGOYLE','BANSHEE','MINOTAUR','LICH','DRAGON_WHELP','ELEMENTAL_GOLEM'
  ];
  for (const key of newMonsters) {
    if (!MONSTER_SKILL_SETS[key]) {
      console.error('missing skill set for', key);
      process.exit(1);
    }
    if (!MONSTER_TRAIT_SETS[key]) {
      console.error('missing trait set for', key);
      process.exit(1);
    }
  }
}

run().catch(e => { console.error(e); process.exit(1); });
