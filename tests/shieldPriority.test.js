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

  const { gameState, createMercenary, assignSkill, skill1Action, movePlayer, getStat } = win;

  gameState.player.skills.push('GuardianHymn');
  assignSkill(1, 'GuardianHymn');

  const merc = createMercenary('WARRIOR', gameState.player.x + 1, gameState.player.y);
  gameState.activeMercenaries.push(merc);

  // First cast with base intelligence
  gameState.player.intelligence = 5;
  gameState.player.mana = 10;
  skill1Action();
  const firstShield = gameState.player.shield;

  // Wait for cooldown and cast again with same power
  gameState.player.mana = 10;
  movePlayer(1, 0);
  movePlayer(-1, 0);
  skill1Action();
  if (gameState.player.shield !== firstShield) {
    console.error('shield stacked when it should not');
    process.exit(1);
  }

  // Increase power and cast again; shield should update to new higher value
  gameState.player.intelligence = 10;
  gameState.player.mana = 10;
  movePlayer(1, 0);
  movePlayer(-1, 0);
  skill1Action();
  const expected = Math.floor(getStat(gameState.player, 'magicPower'));
  if (gameState.player.shield !== expected) {
    console.error('higher shield value not applied');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
