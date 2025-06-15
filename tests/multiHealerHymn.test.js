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
    processMercenaryTurn,
    gameState,
    getStat
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
  gameState.player.gold = 1000;

  hireMercenary('HEALER');
  hireMercenary('HEALER');
  const healer1 = gameState.activeMercenaries[0];
  const healer2 = gameState.activeMercenaries[1];

  healer1.skill = 'GuardianHymn';
  healer2.skill = 'GuardianHymn';
  healer1.mana = healer1.maxMana = 10;
  healer2.mana = healer2.maxMana = 10;

  const shieldVal1 = Math.floor(getStat(healer1, 'magicPower'));
  const shieldVal2 = Math.floor(getStat(healer2, 'magicPower'));

  healer1.shield = shieldVal1;
  healer1.shieldTurns = MERCENARY_SKILLS['GuardianHymn'].duration;
  healer2.shield = shieldVal2;
  healer2.shieldTurns = MERCENARY_SKILLS['GuardianHymn'].duration;
  const playerShield = Math.floor(getStat(healer1, 'magicPower'));
  gameState.player.shield = playerShield;
  gameState.player.shieldTurns = MERCENARY_SKILLS['GuardianHymn'].duration;

  const mana1 = healer1.mana;
  const mana2 = healer2.mana;
  const cd1 = healer1.skillCooldowns['GuardianHymn'] || 0;
  const cd2 = healer2.skillCooldowns['GuardianHymn'] || 0;

  const origRandom = win.Math.random;
  win.Math.random = () => 0;
  processMercenaryTurn(healer1, gameState.monsters);
  processMercenaryTurn(healer2, gameState.monsters);
  win.Math.random = origRandom;

  if (healer1.mana !== mana1 || healer2.mana !== mana2) {
    console.error('mana consumed despite full shields');
    process.exit(1);
  }
  if ((healer1.skillCooldowns['GuardianHymn'] || 0) !== cd1 ||
      (healer2.skillCooldowns['GuardianHymn'] || 0) !== cd2) {
    console.error('cooldown applied despite full shields');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
