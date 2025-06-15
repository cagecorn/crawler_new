const { loadGame } = require('./helpers');

async function run() {
  const win = await loadGame();
  win.updateStats = () => {};
  win.updateMercenaryDisplay = () => {};
  win.updateInventoryDisplay = () => {};
  win.renderDungeon = () => {};
  win.updateCamera = () => {};
  win.requestAnimationFrame = fn => fn();

  // Stub rollDice so status effects always apply
  const originalRoll = win.rollDice;
  win.rollDice = () => 20;

  const { tryApplyStatus, movePlayer, skill1Action, purifyTarget, applyStatusEffects, gameState } = win;

  const size = 3;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
  gameState.player.x = 1;
  gameState.player.y = 1;

  // paralysis prevents movement
  tryApplyStatus(gameState.player, 'paralysis', 1);
  movePlayer(1, 0);
  if (gameState.player.x !== 1) {
    console.error('player moved while paralyzed');
    process.exit(1);
  }

  // silence prevents skill use
  tryApplyStatus(gameState.player, 'silence', 1);
  gameState.player.skills.push('Heal');
  gameState.player.assignedSkills[1] = 'Heal';
  gameState.player.skillLevels['Heal'] = 1;
  gameState.player.mana = 10;
  skill1Action();
  if (gameState.player.mana !== 10) {
    console.error('silenced skill consumed mana');
    process.exit(1);
  }

  // nightmare deals damage and purify removes
  gameState.player.health = 10;
  tryApplyStatus(gameState.player, 'nightmare', 1);
  applyStatusEffects(gameState.player);
  if (gameState.player.health !== 8) {
    console.error('nightmare did not deal damage');
    process.exit(1);
  }
  purifyTarget(gameState.player, gameState.player, {icon:'',name:'Purify'});
  if (gameState.player.nightmare) {
    console.error('purify did not remove status');
    process.exit(1);
  }

  // Restore original rollDice implementation
  win.rollDice = originalRoll;

  console.log('status ok');
}

run().catch(e => { console.error(e); process.exit(1); });
