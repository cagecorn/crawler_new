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

  const { gameState, createMonster, createItem, getStat } = win;

  const size = 9;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
  gameState.player.x = 4;
  gameState.player.y = 4;
  gameState.dungeon[4][4] = 'empty';

  const m1 = createMonster('ZOMBIE', 5, 4); // target, in radius
  const m2 = createMonster('ZOMBIE', 6, 4); // in radius
  const m3 = createMonster('ZOMBIE', 8, 4); // out of radius
  const m4 = createMonster('ZOMBIE', 4, 8); // out of radius
  gameState.monsters.push(m1, m2, m3, m4);
  for (const m of [m1, m2, m3, m4]) {
    gameState.dungeon[m.y][m.x] = 'monster';
  }

  const weapon = createItem('volcanicEruptor', 0, 0);
  weapon.procs = [{ trigger: 'onAttack', skill: 'FireNova', chance: 1 }];
  gameState.player.equipped.weapon = weapon;

  win.rollDice = spec => {
    if (spec === '1d20') return 20;
    const m = /^1d(\d+)/.exec(spec);
    if (m) return parseInt(m[1]);
    return 1;
  };
  win.Math.random = () => 0;

  let captured = [];
  const origPerform = win.performAttack;
  win.performAttack = (att, def, opts, skillName) => {
    captured.push(opts || {});
    return origPerform(att, def, opts, skillName);
  };

  win.performAttack(gameState.player, m1);

  const damaged = [m1, m2];
  const untouched = [m3, m4];
  if (damaged.some(mon => mon.health === mon.maxHealth)) {
    console.error('monsters in range not damaged');
    process.exit(1);
  }
  if (untouched.some(mon => mon.health !== mon.maxHealth)) {
    console.error('monsters out of range damaged');
    process.exit(1);
  }

  const novaCalls = captured.filter(c => c && c.skipProcs);
  const expectedAttack = getStat(gameState.player, 'magicPower');
  if (
    novaCalls.length !== 2 ||
    novaCalls.some(c => c.damageDice !== '1d6' || c.attackValue !== expectedAttack)
  ) {
    console.error('nova proc attack options incorrect', JSON.stringify(novaCalls));
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
