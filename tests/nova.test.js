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

  const size = 5;
  const { assignSkill, skill1Action, createMonster, createItem, gameState, getStat } = win;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
  gameState.monsters = [];
  gameState.player.x = 1;
  gameState.player.y = 1;
  gameState.dungeon[1][1] = 'empty';

  // Test Fire Nova
  gameState.player.skills.push('FireNova');
  assignSkill(1, 'FireNova');
  const fireWeapon = createItem('shortSword', 0, 0);
  fireWeapon.fireDamage = 2;
  gameState.player.equipped.weapon = fireWeapon;
  gameState.player.intelligence = 4;

  const m1 = createMonster('ZOMBIE', gameState.player.x + 1, gameState.player.y);
  const m2 = createMonster('ZOMBIE', gameState.player.x, gameState.player.y + 2);
  gameState.monsters.push(m1, m2);
  gameState.dungeon[m1.y][m1.x] = 'monster';
  gameState.dungeon[m2.y][m2.x] = 'monster';

  let captured = [];
  const origPerform = win.performAttack;
  win.performAttack = (att, def, opts, skillName) => { captured.push(opts); return origPerform(att, def, opts, skillName); };
  win.rollDice = () => 4;
  skill1Action();

  const expected = 4 + getStat(gameState.player, 'magicPower');
  const relevantFire = captured.filter(c => c.element);
  if (relevantFire.length !== 2 || relevantFire.some(c => c.attackValue !== expected || c.element !== 'fire')) {
    console.error('fire nova incorrect', JSON.stringify(captured));
    process.exit(1);
  }

  // Test Ice Nova
  captured = [];
  gameState.monsters = [];
  gameState.dungeon[m1.y][m1.x] = 'empty';
  gameState.dungeon[m2.y][m2.x] = 'empty';
  const i1 = createMonster('ZOMBIE', gameState.player.x + 1, gameState.player.y);
  const i2 = createMonster('ZOMBIE', gameState.player.x, gameState.player.y + 2);
  gameState.monsters.push(i1, i2);
  gameState.dungeon[i1.y][i1.x] = 'monster';
  gameState.dungeon[i2.y][i2.x] = 'monster';
  gameState.player.skills.push('IceNova');
  assignSkill(1, 'IceNova');
  const iceWeapon = createItem('shortSword', 0, 0);
  iceWeapon.iceDamage = 2;
  gameState.player.equipped.weapon = iceWeapon;
  win.rollDice = () => 5;
  skill1Action();

  const expectedIce = 5 + getStat(gameState.player, 'magicPower');
  const relevantIce = captured.filter(c => c.element);
  if (relevantIce.length !== 2 || relevantIce.some(c => c.attackValue !== expectedIce || c.element !== 'ice')) {
    console.error('ice nova incorrect', JSON.stringify(captured));
    process.exit(1);
  }

  // Test Wind Nova
  captured = [];
  gameState.monsters = [];
  gameState.dungeon[i1.y][i1.x] = 'empty';
  gameState.dungeon[i2.y][i2.x] = 'empty';
  const w1 = createMonster('ZOMBIE', gameState.player.x + 1, gameState.player.y);
  const w2 = createMonster('ZOMBIE', gameState.player.x, gameState.player.y + 2);
  gameState.monsters.push(w1, w2);
  gameState.dungeon[w1.y][w1.x] = 'monster';
  gameState.dungeon[w2.y][w2.x] = 'monster';
  gameState.player.skills.push('WindNova');
  assignSkill(1, 'WindNova');
  const windWeapon = createItem('shortSword', 0, 0);
  windWeapon.windDamage = 2;
  gameState.player.equipped.weapon = windWeapon;
  win.rollDice = () => 6;
  skill1Action();

  const expectedWind = 6 + getStat(gameState.player, 'magicPower');
  const relevantWind = captured.filter(c => c.element);
  if (relevantWind.length !== 2 || relevantWind.some(c => c.attackValue !== expectedWind || c.element !== 'wind')) {
    console.error('wind nova incorrect', JSON.stringify(captured));
    process.exit(1);
  }

  // Test Earth Nova
  captured = [];
  gameState.monsters = [];
  gameState.dungeon[w1.y][w1.x] = 'empty';
  gameState.dungeon[w2.y][w2.x] = 'empty';
  const e1 = createMonster('ZOMBIE', gameState.player.x + 1, gameState.player.y);
  const e2 = createMonster('ZOMBIE', gameState.player.x, gameState.player.y + 2);
  gameState.monsters.push(e1, e2);
  gameState.dungeon[e1.y][e1.x] = 'monster';
  gameState.dungeon[e2.y][e2.x] = 'monster';
  gameState.player.skills.push('EarthNova');
  assignSkill(1, 'EarthNova');
  const earthWeapon = createItem('shortSword', 0, 0);
  earthWeapon.earthDamage = 2;
  gameState.player.equipped.weapon = earthWeapon;
  win.rollDice = () => 4;
  skill1Action();

  const expectedEarth = 4 + getStat(gameState.player, 'magicPower');
  const relevantEarth = captured.filter(c => c.element);
  if (relevantEarth.length !== 2 || relevantEarth.some(c => c.attackValue !== expectedEarth || c.element !== 'earth')) {
    console.error('earth nova incorrect', JSON.stringify(captured));
    process.exit(1);
  }

  // Test Light Nova
  captured = [];
  gameState.monsters = [];
  gameState.dungeon[e1.y][e1.x] = 'empty';
  gameState.dungeon[e2.y][e2.x] = 'empty';
  const l1 = createMonster('ZOMBIE', gameState.player.x + 1, gameState.player.y);
  const l2 = createMonster('ZOMBIE', gameState.player.x, gameState.player.y + 2);
  gameState.monsters.push(l1, l2);
  gameState.dungeon[l1.y][l1.x] = 'monster';
  gameState.dungeon[l2.y][l2.x] = 'monster';
  gameState.player.skills.push('LightNova');
  assignSkill(1, 'LightNova');
  const lightWeapon = createItem('shortSword', 0, 0);
  lightWeapon.lightDamage = 2;
  gameState.player.equipped.weapon = lightWeapon;
  win.rollDice = () => 5;
  skill1Action();

  const expectedLight = 5 + getStat(gameState.player, 'magicPower');
  const relevantLight = captured.filter(c => c.element);
  if (relevantLight.length !== 2 || relevantLight.some(c => c.attackValue !== expectedLight || c.element !== 'light')) {
    console.error('light nova incorrect', JSON.stringify(captured));
    process.exit(1);
  }

  // Test Dark Nova
  captured = [];
  gameState.monsters = [];
  gameState.dungeon[l1.y][l1.x] = 'empty';
  gameState.dungeon[l2.y][l2.x] = 'empty';
  const d1 = createMonster('ZOMBIE', gameState.player.x + 1, gameState.player.y);
  const d2 = createMonster('ZOMBIE', gameState.player.x, gameState.player.y + 2);
  gameState.monsters.push(d1, d2);
  gameState.dungeon[d1.y][d1.x] = 'monster';
  gameState.dungeon[d2.y][d2.x] = 'monster';
  gameState.player.skills.push('DarkNova');
  assignSkill(1, 'DarkNova');
  const darkWeapon = createItem('shortSword', 0, 0);
  darkWeapon.darkDamage = 2;
  gameState.player.equipped.weapon = darkWeapon;
  win.rollDice = () => 6;
  skill1Action();

  const expectedDark = 6 + getStat(gameState.player, 'magicPower');
  const relevantDark = captured.filter(c => c.element);
  if (relevantDark.length !== 2 || relevantDark.some(c => c.attackValue !== expectedDark || c.element !== 'dark')) {
    console.error('dark nova incorrect', JSON.stringify(captured));
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
