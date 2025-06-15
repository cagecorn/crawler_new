const { loadGame } = require('./helpers');

async function run() {
  const win = await loadGame();
  win.updateStats = () => {};
  win.updateMercenaryDisplay = () => {};
  win.updateInventoryDisplay = () => {};
  win.renderDungeon = () => {};
  win.updateSkillDisplay = () => {};
  win.requestAnimationFrame = fn => fn();

  const { createItem, createMonster, performAttack, gameState, getStat } = win;

  const weapon = createItem('shortSword', 0, 0, 'Gusty');
  if (weapon.windDamage !== 2) {
    console.error('wind prefix not applied');
    process.exit(1);
  }

  gameState.player.equipped.weapon = weapon;
  const monster = createMonster('ZOMBIE', gameState.player.x + 1, gameState.player.y);

  win.rollDice = notation => (notation.includes('20') ? 20 : 1);
  win.Math.random = () => 0;

  const result = performAttack(gameState.player, monster, { element: 'wind', damageDice: '1d4' }, 'test');
  if (result.elementDamage !== getStat(gameState.player, 'windDamage')) {
    console.error('element damage not applied');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
