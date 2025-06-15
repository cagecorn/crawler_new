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

  const { gameState, createMonster, createItem, performAttack, getStat } = win;
  const SKILL_DEFS = win.eval('SKILL_DEFS');

  const monster = createMonster('GOBLIN', gameState.player.x + 1, gameState.player.y, 1);
  gameState.monsters.push(monster);
  gameState.dungeon[monster.y][monster.x] = 'monster';

  const amulet = createItem('guardianAmulet', 0, 0);
  gameState.player.equipped.accessory1 = amulet;
  gameState.player.intelligence = 5;

  win.Math.random = () => 0;
  win.rollDice = spec => {
    if (spec === '1d20') return 20;
    const m = /^1d(\d+)/.exec(spec);
    if (m) return parseInt(m[1]);
    return 1;
  };

  performAttack(monster, gameState.player);

  const expected = Math.floor(getStat(gameState.player, 'magicPower') * (amulet.procs[0].level || 1));
  if (gameState.player.shield !== expected || gameState.player.shieldTurns !== SKILL_DEFS['GuardianHymn'].duration) {
    console.error('guardian amulet did not apply shield');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
