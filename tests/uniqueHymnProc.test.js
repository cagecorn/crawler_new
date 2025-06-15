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

  const { gameState, createMonster, createItem, monsterAttack } = win;
  const SKILL_DEFS = win.eval('SKILL_DEFS');

  const size = 5;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
  gameState.player.x = 2;
  gameState.player.y = 2;
  gameState.dungeon[2][2] = 'empty';

  const monster = createMonster('GOBLIN', 3, 2, 1);
  gameState.monsters.push(monster);
  gameState.dungeon[monster.y][monster.x] = 'monster';

  gameState.player.intelligence = 5;

  win.rollDice = notation => (notation.includes('20') ? 20 : 1);
  win.Math.random = () => 0;

  // ensure procs target the player
  const origHandle = win.handleProcs;
  win.handleProcs = (unit, type, opponent) => {
    if (type === 'onDamaged') return origHandle(unit, type, null);
    return origHandle(unit, type, opponent);
  };

  // Guardian Amulet proc
  gameState.player.equipped.accessory1 = createItem('guardianAmulet', 0, 0);
  monsterAttack(monster);
  if (gameState.player.shield <= 0) {
    console.error('guardian amulet did not grant shield');
    process.exit(1);
  }
  if (gameState.player.shieldTurns !== SKILL_DEFS['GuardianHymn'].duration) {
    console.error('guardian hymn duration incorrect');
    process.exit(1);
  }

  // Courage Amulet proc
  gameState.player.shield = 0;
  gameState.player.shieldTurns = 0;
  gameState.player.attackBuff = 0;
  gameState.player.attackBuffTurns = 0;
  gameState.player.equipped.accessory1 = createItem('courageAmulet', 0, 0);
  monsterAttack(monster);
  if (gameState.player.attackBuff <= 0) {
    console.error('courage amulet did not grant attack buff');
    process.exit(1);
  }
  if (gameState.player.attackBuffTurns !== SKILL_DEFS['CourageHymn'].duration) {
    console.error('courage hymn duration incorrect');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
