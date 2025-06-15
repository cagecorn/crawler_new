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

  const { createItem, formatItem, gameState, createMonster, performAttack, getStat } = win;

  const seq = [0, 0, 0, 0.65];
  const origRandom = win.Math.random;
  win.Math.random = () => seq.shift() ?? origRandom();

  const weapon = createItem('shortSword', 0, 0, 'Vampiric');

  win.Math.random = origRandom;

  if (weapon.prefix !== 'Vampiric' || weapon.suffix !== 'of Leeching') {
    console.error('affixes not applied');
    process.exit(1);
  }
  if (Math.abs(weapon.lifeSteal - 0.1) > 1e-6) {
    console.error('lifesteal value incorrect');
    process.exit(1);
  }
  const desc = formatItem(weapon);
  if (!desc.includes('흡혈+')) {
    console.error('formatItem missing lifesteal info');
    process.exit(1);
  }

  gameState.player.equipped.weapon = weapon;
  const monster = createMonster('ZOMBIE', gameState.player.x + 1, gameState.player.y);
  gameState.monsters.push(monster);
  gameState.dungeon[monster.y][monster.x] = 'monster';

  gameState.player.health = 10;
  // Boost player attack so life steal has damage to work with
  gameState.player.strength = 20;

  win.rollDice = spec => {
    if (spec === '1d20') return 20;
    const m = /^1d(\d+)/.exec(spec);
    if (m) return parseInt(m[1], 10);
    return 1;
  };
  win.Math.random = () => 0;

  const start = gameState.player.health;
  performAttack(gameState.player, monster);
  if (gameState.player.health <= start) {
    console.error('lifesteal did not heal');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
