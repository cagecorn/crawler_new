const { loadGame } = require('./helpers');
const assert = require('assert');

async function run() {
  const win = await loadGame();

  // stub out visual functions
  win.updateStats = () => {};
  win.updateMercenaryDisplay = () => {};
  win.updateInventoryDisplay = () => {};
  win.renderDungeon = () => {};
  win.updateCamera = () => {};
  win.updateSkillDisplay = () => {};
  win.requestAnimationFrame = fn => fn();

  const {
    hireMercenary,
    createMonster,
    processMercenaryTurn,
    gameState
  } = win;

  gameState.player.gold = 500;

  const MERCENARY_SKILLS = win.eval('MERCENARY_SKILLS');

  // create a simple empty dungeon
  const size = 5;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
  gameState.monsters = [];
  gameState.player.x = 1;
  gameState.player.y = 1;
  gameState.dungeon[1][1] = 'empty';

  hireMercenary('WIZARD');
  const merc = gameState.activeMercenaries[0];

  assert.ok(MERCENARY_SKILLS[merc.skill], 'invalid mercenary skill');

  const monsterX = merc.x + 1 < size ? merc.x + 1 : merc.x - 1;
  const monsterY = merc.y;
  const monster = createMonster('ZOMBIE', monsterX, monsterY);
  monster.health = monster.maxHealth = 999; // prevent death side-effects
  gameState.monsters.push(monster);
  gameState.dungeon[monsterY][monsterX] = 'monster';

  const skillCost = MERCENARY_SKILLS[merc.skill].manaCost;
  merc.mana = merc.maxMana;
  const initialMana = merc.mana;
  const origRandom = win.Math.random;
  win.Math.random = () => 0;

  processMercenaryTurn(merc, gameState.monsters);

  win.Math.random = origRandom;

  const expected = initialMana - skillCost;
  assert.strictEqual(merc.mana, expected, 'mana should decrease by skill cost');
}

run().catch(e => { console.error(e); process.exit(1); });
