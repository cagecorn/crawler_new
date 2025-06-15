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

  const { createItem, createMonster, killMonster, gameState, getStat } = win;

  win.Math.random = () => 0;
  const weapon = createItem('shortSword', 0, 0, 'Rejuvenating');
  if (weapon.prefix !== 'Rejuvenating' || weapon.healOnKill !== 5) {
    console.error('prefix not applied or incorrect value');
    process.exit(1);
  }

  gameState.player.equipped.weapon = weapon;
  const monster = createMonster('ZOMBIE', gameState.player.x + 1, gameState.player.y);
  gameState.monsters.push(monster);
  gameState.dungeon[monster.y][monster.x] = 'monster';

  gameState.player.health = 10;
  win.Math.random = () => 1;
  const expectHp = Math.min(10 + weapon.healOnKill, getStat(gameState.player, 'maxHealth'));
  killMonster(monster);
  if (gameState.player.health !== expectHp) {
    console.error('heal on kill not applied');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
