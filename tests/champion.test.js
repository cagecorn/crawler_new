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

  const { createChampion, killMonster, reviveMonsterCorpse, gameState, createItem } = win;
  const MONSTER_SKILLS = win.eval('MONSTER_SKILLS');
  const MERCENARY_SKILLS = win.eval('MERCENARY_SKILLS');

  const champ = createChampion('WARRIOR', 0, 0, 3);
  if (!champ.isChampion || champ.level !== 3) {
    console.error('champion creation failed');
    process.exit(1);
  }
  const total = Object.values(champ.stars).reduce((a,b)=>a+b,0);
  if (total > 9) {
    console.error('champion stars invalid');
    process.exit(1);
  }
  const skillInfo = MONSTER_SKILLS[champ.monsterSkill] || MERCENARY_SKILLS[champ.monsterSkill];
  if (!skillInfo) {
    console.error('champion skill invalid');
    process.exit(1);
  }

  win.showChampionDetails(champ);
  const html = win.document.getElementById('monster-detail-content').innerHTML;
  if (!html.includes('⭐'.repeat(champ.stars.strength))) {
    console.error('champion details missing info');
    process.exit(1);
  }
  if (!html.includes(skillInfo.name)) {
    console.error('champion details missing info');
    process.exit(1);
  }


  const scaled = createChampion('ARCHER', 0, 0, 5);
  if (scaled.level !== 5) {
    console.error('level scaling failed');
    process.exit(1);
  }

  const dropChamp = createChampion('ARCHER', 1, 1, 1);
  dropChamp.equipped.weapon = createItem('shortSword', 0, 0);
  gameState.monsters = [dropChamp];
  gameState.items = [];
  gameState.dungeon = Array.from({ length: 3 }, () => Array(3).fill('empty'));
  gameState.dungeon[1][1] = 'monster';
  killMonster(dropChamp);
  if (gameState.items.length !== 1) {
    console.error('champion drop not guaranteed');
    process.exit(1);
  }

  gameState.player.gold = 1000;
  reviveMonsterCorpse(dropChamp);
  const merc = gameState.activeMercenaries.find(m => m.id === dropChamp.id);
  if (!merc || merc.stars.strength !== dropChamp.stars.strength || merc.skill !== dropChamp.monsterSkill) {
    console.error('champion stats not kept after revival');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
