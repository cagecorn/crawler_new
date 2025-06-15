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
    killMonster,
    reviveMonsterCorpse,
    gameState
  } = win;

  const MONSTER_SKILLS = win.eval('MONSTER_SKILLS');
  const MONSTER_SKILL_SETS = win.eval('MONSTER_SKILL_SETS');

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
    { type: 'ZOMBIE', level: 4 },
    { type: 'DEMON_WARRIOR', level: 5 }
  ];

  for (const { type, level } of tests) {
    const monster = createMonster(type, 1, 1, level);
    if (!monster.monsterSkill || !MONSTER_SKILL_SETS[type].includes(monster.monsterSkill)) {
      console.error('monster skill not assigned');
      process.exit(1);
    }
    const expectedLvl = Math.floor((level - 1) / 3) + 1;
    if (monster.skillLevels[monster.monsterSkill] !== expectedLvl) {
      console.error('monster skill level not scaled');
      process.exit(1);
    }

    gameState.monsters.push(monster);
    gameState.dungeon[1][1] = 'monster';
    killMonster(monster);
    gameState.player.gold = 1000;
    reviveMonsterCorpse(monster);
    const merc = gameState.activeMercenaries.find(m => m.id === monster.id);
    if (!merc || merc.skill !== monster.monsterSkill) {
      console.error('monster skill not kept after revival');
      process.exit(1);
    }
    if (merc.skillLevels[merc.skill] !== expectedLvl) {
      console.error('skill level not kept after revival');
      process.exit(1);
    }

    gameState.activeMercenaries = [];
    gameState.monsters = [];
    gameState.corpses = [];
  }
}

run().catch(e => { console.error(e); process.exit(1); });
