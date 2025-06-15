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

  const {
    gameState,
    createItem,
    getSkillRange,
    getSkillCooldown,
    getSkillManaCost,
    getSkillPowerMult
  } = win;
  const SKILL_DEFS = win.eval('SKILL_DEFS');

  win.Math.random = () => 0.9;
  const weapon = createItem('shortSword', 0, 0);
  const armor = createItem('leatherArmor', 0, 0);
  const acc1 = createItem('critCharm', 0, 0);
  const acc2 = createItem('evasionCharm', 0, 0);
  win.Math.random = Math.random;

  weapon.prefix = 'Long-range';
  weapon.skillRangeBonus = 1;
  armor.prefix = 'Quickcast';
  armor.skillCooldownMod = -1;
  acc1.prefix = 'Efficient';
  acc1.skillManaCostMult = 0.5;
  acc2.prefix = 'Empowered';
  acc2.skillPowerMult = 1.5;

  gameState.player.equipped.weapon = weapon;
  gameState.player.equipped.armor = armor;
  gameState.player.equipped.accessory1 = acc1;
  gameState.player.equipped.accessory2 = acc2;

  const fireball = SKILL_DEFS['Fireball'];
  const range = getSkillRange(gameState.player, fireball);
  const cooldown = getSkillCooldown(gameState.player, fireball);
  const manaCost = getSkillManaCost(gameState.player, fireball);
  const power = getSkillPowerMult(gameState.player);

  if (range !== fireball.range + 1) {
    console.error('getSkillRange incorrect');
    process.exit(1);
  }
  if (cooldown !== Math.max(0, fireball.cooldown - 1)) {
    console.error('getSkillCooldown incorrect');
    process.exit(1);
  }
  if (manaCost !== Math.max(0, Math.floor(fireball.manaCost * 0.5))) {
    console.error('getSkillManaCost incorrect');
    process.exit(1);
  }
  if (power !== 1.5) {
    console.error('getSkillPowerMult incorrect');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
