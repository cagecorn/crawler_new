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

  const { gameState, unequipWeapon, unequipArmor } = win;

  const weapon = gameState.player.equipped.weapon;
  const armor = gameState.player.equipped.armor;
  if (!weapon || !armor) {
    console.error('starting equipment missing');
    process.exit(1);
  }

  const invBefore = gameState.player.inventory.length;
  unequipWeapon();
  if (gameState.player.equipped.weapon !== null) {
    console.error('weapon not unequipped');
    process.exit(1);
  }
  if (!gameState.player.inventory.includes(weapon) || gameState.player.inventory.length !== invBefore + 1) {
    console.error('weapon not added to inventory');
    process.exit(1);
  }

  unequipArmor();
  if (gameState.player.equipped.armor !== null) {
    console.error('armor not unequipped');
    process.exit(1);
  }
  if (!gameState.player.inventory.includes(armor) || gameState.player.inventory.length !== invBefore + 2) {
    console.error('armor not added to inventory');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
