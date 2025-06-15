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

  const { createItem, gameState, createMonster, performAttack } = win;

  const weapon = createItem('shortSword', 0, 0, 'Thorny');
  if (weapon.prefix !== 'Thorny' || Math.abs(weapon.damageReflect - 0.1) > 1e-6) {
    console.error('prefix not applied or incorrect value');
    process.exit(1);
  }

  gameState.player.equipped.weapon = weapon;
  const monster = createMonster('ZOMBIE', gameState.player.x + 1, gameState.player.y);
  gameState.monsters.push(monster);
  gameState.dungeon[monster.y][monster.x] = 'monster';

  win.rollDice = spec => {
    if (spec === '1d20') return 20;
    const m = /^1d(\d+)/.exec(spec);
    if (m) return parseInt(m[1], 10);
    return 1;
  };
  win.Math.random = () => 0.99;

  const startHp = monster.health;
  const result = performAttack(monster, gameState.player, { attackValue: 30, defenseValue: 0, damageDice: '1d4' });
  const expected = Math.floor(result.damage * weapon.damageReflect);
  if (monster.health !== startHp - expected) {
    console.error('reflected damage incorrect');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
