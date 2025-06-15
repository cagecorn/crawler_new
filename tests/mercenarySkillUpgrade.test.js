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
    hireMercenary,
    checkMercenaryLevelUp,
    upgradeMercenarySkill,
    processMercenaryTurn,
    gameState,
    getStat
  } = win;
  const MERCENARY_SKILLS = win.eval('MERCENARY_SKILLS');

  // create basic dungeon
  const size = 5;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
  gameState.monsters = [];
  gameState.player.x = 1;
  gameState.player.y = 1;
  gameState.dungeon[1][1] = 'empty';

  hireMercenary('HEALER');
  const merc = gameState.activeMercenaries[0];
  const skillKey = merc.skill;

  // level up check gives skill point
  merc.exp = merc.expNeeded;
  const beforePoints = merc.skillPoints;
  checkMercenaryLevelUp(merc);
  assert.strictEqual(merc.skillPoints, beforePoints + 1, 'skill points not gained on level up');

  // upgrade skill
  gameState.player.gold = 1000;
  merc.skillPoints = 1;
  const beforeGold = gameState.player.gold;
  const beforeLevel = merc.skillLevels[skillKey];
  const cost = 50 * beforeLevel * beforeLevel;
  upgradeMercenarySkill(merc, skillKey);
  assert.strictEqual(gameState.player.gold, beforeGold - cost, 'gold not deducted');
  assert.strictEqual(merc.skillLevels[skillKey], beforeLevel + 1, 'skill level not increased');
  assert.strictEqual(merc.skillPoints, 0, 'skill points not spent');

  // skill scaling
  merc.mana = merc.maxMana = 10;
  merc.health = Math.floor(getStat(merc, 'maxHealth') * 0.4);
  const healLevel = merc.skillLevels[skillKey];
  const manaBefore = merc.mana;
  const healthBefore = merc.health;
  const origRandom = win.Math.random;
  win.Math.random = () => 0;
  processMercenaryTurn(merc, gameState.monsters);
  win.Math.random = origRandom;
  const manaExpected = manaBefore - (MERCENARY_SKILLS[skillKey].manaCost + healLevel - 1);
  assert.strictEqual(merc.mana, manaExpected, 'mana cost not scaled with level');
  const base = 3 + merc.level;
  const power = getStat(merc, 'magicPower');
  const healExpected = Math.min((base + power) * healLevel, getStat(merc, 'maxHealth') - healthBefore);
  assert.strictEqual(merc.health, healthBefore + healExpected, 'heal amount not scaled with level');
}

run().catch(e => { console.error(e); process.exit(1); });
