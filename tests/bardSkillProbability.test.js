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
  bard.shield = 0;
  gameState.activeMercenaries.push(bard);

  const wizard = createMercenary('WIZARD', 3, 1);
  wizard.skill = 'Fireball';
  wizard.mana = wizard.maxMana;
  gameState.activeMercenaries.push(wizard);

  const monster = createMonster('GOBLIN', 3, 2, 1);
  monster.alive = true;
  gameState.monsters.push(monster);
  gameState.dungeon[monster.y][monster.x] = 'monster';

  const bardCost = MERCENARY_SKILLS[bard.skill].manaCost;
  const origRandom = win.Math.random;
  win.Math.random = () => 0.99;

  processMercenaryTurn(bard, gameState.monsters);
  processMercenaryTurn(wizard, gameState.monsters);

  win.Math.random = origRandom;

  assert.strictEqual(bard.mana, bard.maxMana - bardCost, 'Bard should cast hymn regardless of random roll');
  assert.strictEqual(wizard.mana, wizard.maxMana, 'Other mercenaries should not cast when random roll exceeds threshold');
}

run().catch(e => { console.error(e); process.exit(1); });
