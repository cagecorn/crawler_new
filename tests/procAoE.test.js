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

  const { gameState, createMonster, createItem, createMercenary, performAttack } = win;

  const size = 9;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
  gameState.player.x = 4;
  gameState.player.y = 4;
  gameState.dungeon[4][4] = 'empty';

  const inRange = createMonster('ZOMBIE', 5, 4);
  const outRange = createMonster('ZOMBIE', 8, 4);
  gameState.monsters.push(inRange, outRange);
  gameState.dungeon[inRange.y][inRange.x] = 'monster';
  gameState.dungeon[outRange.y][outRange.x] = 'monster';

  const ally = createMercenary('WARRIOR', 4, 5);
  gameState.activeMercenaries.push(ally);

  const weapon = createItem('shortSword', 0, 0);
  weapon.procs = [{ trigger: 'onAttack', skill: 'FireNova', chance: 1 }];
  gameState.player.equipped.weapon = weapon;

  let procCalls = 0;
  const origHandle = win.handleProcs;
  win.handleProcs = (...args) => {
    procCalls++;
    return origHandle(...args);
  };

  win.rollDice = spec => {
    if (spec === '1d20') return 20;
    const m = /^1d(\d+)/.exec(spec);
    if (m) return parseInt(m[1]);
    return 1;
  };
  win.Math.random = () => 0;

  performAttack(gameState.player, inRange);

  if (inRange.health === inRange.maxHealth) {
    console.error('in-range enemy not damaged');
    process.exit(1);
  }
  if (outRange.health !== outRange.maxHealth) {
    console.error('out-of-range enemy damaged');
    process.exit(1);
  }
  if (ally.health !== ally.maxHealth) {
    console.error('ally was damaged');
    process.exit(1);
  }
  if (procCalls !== 2) {
    console.error('proc triggered multiple times');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
