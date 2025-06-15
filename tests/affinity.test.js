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
    hireMercenary,
    createMonster,
    killMonster,
    reviveMonsterCorpse,
    monsterAttack,
    advanceGameLoop,
    showMercenaryDetails,
    gameState
  } = win;

  const size = 3;
  gameState.dungeonSize = size;
  gameState.dungeon = Array.from({ length: size }, () => Array(size).fill('empty'));
  gameState.fogOfWar = Array.from({ length: size }, () => Array(size).fill(false));
  gameState.monsters = [];
  gameState.items = [];
  gameState.corpses = [];
  gameState.activeMercenaries = [];
  gameState.player.x = 0;
  gameState.player.y = 0;

  gameState.player.gold = 500;
  hireMercenary('WARRIOR');
  const merc = gameState.activeMercenaries[0];
  if (merc.affinity !== 50) {
    console.error('mercenary affinity not initialized');
    process.exit(1);
  }
  const before = merc.affinity;
  gameState.player.energy = 100;
  advanceGameLoop();
  if (merc.affinity <= before) {
    console.error('affinity did not increase');
    process.exit(1);
  }

  showMercenaryDetails(merc);
  const html = win.document.getElementById('mercenary-detail-content').innerHTML;
  if (!html.includes(String(merc.affinity))) {
    console.error('affinity not shown in details');
    process.exit(1);
  }

  const monster = createMonster('GOBLIN', 1, 1, 1);
  gameState.monsters.push(monster);
  gameState.dungeon[1][1] = 'monster';
  killMonster(monster);
  gameState.player.gold = 1000;
  reviveMonsterCorpse(monster);
  const revived = gameState.activeMercenaries.find(m => m.id === monster.id);
  if (!revived || revived.affinity !== 30) {
    console.error('revived monster affinity incorrect');
    process.exit(1);
  }

  const killer1 = createMonster('ZOMBIE', merc.x + 1, merc.y, 1);
  killer1.attack = 999;
  gameState.monsters.push(killer1);
  win.Math.random = () => 0;
  win.rollDice = () => 20;
  const beforeDeath = merc.affinity;
  monsterAttack(killer1);
  if (merc.affinity !== beforeDeath - 5) {
    console.error('affinity not reduced after death');
    process.exit(1);
  }
  if (!gameState.activeMercenaries.includes(merc)) {
    console.error('mercenary removed prematurely');
    process.exit(1);
  }

  revived.affinity = 5;
  const killer2 = createMonster('ZOMBIE', revived.x + 1, revived.y, 1);
  killer2.attack = 999;
  gameState.monsters.push(killer2);
  monsterAttack(killer2);
  if (gameState.activeMercenaries.includes(revived)) {
    console.error('mercenary not removed at zero affinity');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
