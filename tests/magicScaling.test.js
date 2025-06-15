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

  const {
    hireMercenary,
    createMonster,
    processMercenaryTurn,
    healTarget,
    gameState,
    getStat
  } = win;

  gameState.player.gold = 500;
  const MERCENARY_SKILLS = win.eval('MERCENARY_SKILLS');

  const size = 5;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
  gameState.monsters = [];
  gameState.activeMercenaries = [];
  gameState.player.x = 1;
  gameState.player.y = 1;
  gameState.dungeon[1][1] = 'empty';

  // Heal scaling with magicPower
  gameState.player.health = 10;
  hireMercenary('HEALER');
  const healer = gameState.activeMercenaries[0];
  healer.skill = 'Heal';
  healer.intelligence = 5; // magicPower 5
  const healExpected = Math.min(3 + healer.level + getStat(healer, 'magicPower'),
    getStat(gameState.player, 'maxHealth') - gameState.player.health);
  healTarget(healer, gameState.player, MERCENARY_SKILLS['Heal']);
  if (gameState.player.health !== 10 + healExpected) {
    console.error('heal not scaled with magicPower');
    process.exit(1);
  }

  // Fireball scaling with magicPower
  hireMercenary('WIZARD');
  const fireCaster = gameState.activeMercenaries[1];
  fireCaster.skill = 'Fireball';
  fireCaster.intelligence = 4;
  fireCaster.mana = fireCaster.maxMana = 10;
  const monster1X = fireCaster.x + 1 < size ? fireCaster.x + 1 : fireCaster.x - 1;
  const monster1 = createMonster('ZOMBIE', monster1X, fireCaster.y);
  monster1.health = monster1.maxHealth = 999;
  gameState.monsters.push(monster1);
  gameState.dungeon[monster1.y][monster1.x] = 'monster';

  let captured = null;
  const origPerform = win.performAttack;
  win.performAttack = (att, def, opts, skillName) => {
    captured = opts;
    return origPerform(att, def, opts, skillName);
  };
  win.rollDice = () => 8;
  const origRandom = win.Math.random;
  win.Math.random = () => 0;
  processMercenaryTurn(fireCaster, gameState.monsters);
  win.Math.random = origRandom;
  win.performAttack = origPerform;

  const fireExpected = 8 + getStat(fireCaster, 'magicPower');
  if (!captured || captured.attackValue !== fireExpected || captured.magic !== true || captured.element !== 'fire') {
    console.error('fireball not scaled with magicPower');
    process.exit(1);
  }

  // Iceball scaling with magicPower
  hireMercenary('WIZARD');
  const iceCaster = gameState.activeMercenaries[2];
  iceCaster.skill = 'Iceball';
  iceCaster.intelligence = 7;
  iceCaster.mana = iceCaster.maxMana = 10;
  const monster2X = iceCaster.x + 1 < size ? iceCaster.x + 1 : iceCaster.x - 1;
  const monster2 = createMonster('ZOMBIE', monster2X, iceCaster.y);
  monster2.health = monster2.maxHealth = 999;
  gameState.monsters.push(monster2);
  gameState.dungeon[monster2.y][monster2.x] = 'monster';

  captured = null;
  win.performAttack = (att, def, opts, skillName) => {
    captured = opts;
    return origPerform(att, def, opts, skillName);
  };
  win.rollDice = () => 6;
  win.Math.random = () => 0;
  processMercenaryTurn(iceCaster, gameState.monsters);
  win.Math.random = origRandom;
  win.performAttack = origPerform;

  const iceExpected = 6 + getStat(iceCaster, 'magicPower');
  if (!captured || captured.attackValue !== iceExpected || captured.magic !== true || captured.element !== 'ice') {
    console.error('iceball not scaled with magicPower');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
