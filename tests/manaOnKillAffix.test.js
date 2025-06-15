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
  const weapon = createItem('shortSword', 0, 0, 'Soulful');
  if (weapon.prefix !== 'Soulful' || weapon.manaOnKill !== 5) {
    console.error('prefix not applied or incorrect value');
    process.exit(1);
  }

  gameState.player.equipped.weapon = weapon;
  const monster = createMonster('ZOMBIE', gameState.player.x + 1, gameState.player.y);
  gameState.monsters.push(monster);
  gameState.dungeon[monster.y][monster.x] = 'monster';

  gameState.player.mana = 0;
  win.Math.random = () => 1;
  const expectMp = Math.min(weapon.manaOnKill, getStat(gameState.player, 'maxMana'));
  killMonster(monster);
  if (gameState.player.mana !== expectMp) {
    console.error('mana on kill not applied');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
