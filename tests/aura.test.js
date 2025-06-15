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

  const { gameState, createMercenary, assignSkill, getStat } = win;
  const SKILL_DEFS = win.eval('SKILL_DEFS');

  const size = 5;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
  gameState.player.x = 1;
  gameState.player.y = 1;
  gameState.dungeon[1][1] = 'empty';

  const merc = createMercenary('WARRIOR', 2, 1);
  gameState.activeMercenaries.push(merc);

  assignSkill(1, null);
  assignSkill(2, null);

  const baseAtk = getStat(merc, 'attack');
  const baseMag = getStat(merc, 'magicPower');
  const baseDef = getStat(merc, 'defense');
  const baseRes = getStat(merc, 'magicResist');

  assignSkill(1, 'MightAura');
  const bonusAtk = SKILL_DEFS['MightAura'].aura.attack;
  const bonusMag = SKILL_DEFS['MightAura'].aura.magicPower;
  if (getStat(merc, 'attack') !== baseAtk + bonusAtk || getStat(merc, 'magicPower') !== baseMag + bonusMag) {
    console.error('Might Aura not applied');
    process.exit(1);
  }

  assignSkill(1, null);
  if (getStat(merc, 'attack') !== baseAtk || getStat(merc, 'magicPower') !== baseMag) {
    console.error('Might Aura persisted after unassign');
    process.exit(1);
  }

  assignSkill(2, 'ProtectAura');
  const bonusDef = SKILL_DEFS['ProtectAura'].aura.defense;
  const bonusRes = SKILL_DEFS['ProtectAura'].aura.magicResist;
  if (getStat(merc, 'defense') !== baseDef + bonusDef || getStat(merc, 'magicResist') !== baseRes + bonusRes) {
    console.error('Protect Aura not applied');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
