const { loadGame } = require('./helpers');
const assert = require('assert');

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
    createMercenary,
    createMonster,
    processMercenaryTurn,
    gameState
  } = win;
  const MERCENARY_SKILLS = win.eval('MERCENARY_SKILLS');

  const size = 5;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
  gameState.monsters = [];
  gameState.player.x = 2;
  gameState.player.y = 2;
  gameState.dungeon[2][2] = 'empty';

  const bard = createMercenary('BARD', 2, 1);
  assert.strictEqual(bard.skill2, 'Heal', 'Bard should start with Heal as skill2');
  bard.skill = 'GuardianHymn';
  bard.mana = bard.maxMana;
  gameState.activeMercenaries.push(bard);

  const ally = createMercenary('WARRIOR', 1, 1);
  ally.health = ally.health - 1;
  gameState.activeMercenaries.push(ally);

  const monster = createMonster('GOBLIN', 2, 3, 1);
  monster.alive = true;
  gameState.monsters.push(monster);
  gameState.dungeon[monster.y][monster.x] = 'monster';

  const cost = MERCENARY_SKILLS[bard.skill].manaCost;
  const beforeHealth = ally.health;
  processMercenaryTurn(bard, gameState.monsters);

  assert.strictEqual(ally.health, beforeHealth, 'Bard should prioritize hymn over healing');
  assert.strictEqual(bard.mana, bard.maxMana - cost, 'Bard should cast hymn when enemy is in sight');
}

run().catch(e => { console.error(e); process.exit(1); });
