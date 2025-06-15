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

  const { createEliteMonster, convertMonsterToMercenary, getStat, gameState } = win;
  const SKILL_DEFS = win.eval('SKILL_DEFS');

  const origRandom = win.Math.random;
  win.Math.random = () => 0; // always pick first aura skill
  const elite = createEliteMonster('GOBLIN', 1, 1, 1);
  win.Math.random = origRandom;

  if (!elite.isElite || !elite.auraSkill) {
    console.error('elite not created properly');
    process.exit(1);
  }

  gameState.monsters.push(elite);
  gameState.dungeonSize = 3;
  gameState.dungeon = Array.from({ length: 3 }, () => Array(3).fill('empty'));
  gameState.dungeon[1][1] = 'monster';
  gameState.player.x = 2;
  gameState.player.y = 1;

  const base = gameState.player.healthRegen;
  const regen = getStat(gameState.player, 'healthRegen');
  if (Math.abs(regen - base) > 0.001) {
    console.error('enemy aura applied');
    process.exit(1);
  }

  const merc = convertMonsterToMercenary(elite);
  if (merc.skill !== elite.auraSkill) {
    console.error('aura skill not kept on revival');
    process.exit(1);
  }

  gameState.monsters = [];
  merc.x = 1;
  merc.y = 1;
  gameState.activeMercenaries.push(merc);

  const auraVal = SKILL_DEFS[elite.auraSkill].aura.healthRegen;
  const regen2 = getStat(gameState.player, 'healthRegen');
  if (Math.abs(regen2 - (base + auraVal)) > 0.001) {
    console.error('aura bonus not applied after conversion');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
