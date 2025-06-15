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

  const { createSuperiorMonster, createEliteMonster, createMonster, convertMonsterToMercenary } = win;

  const origRandom = win.Math.random;
  win.Math.random = () => 0;
  const base = createMonster('GOBLIN', 1, 1, 2);
  const elite = createEliteMonster('GOBLIN', 1, 1, 1);
  const monster = createSuperiorMonster('GOBLIN', 1, 1, 1);
  win.Math.random = origRandom;

  if (!monster.isSuperior) {
    console.error('superior flag missing');
    process.exit(1);
  }
  if (!monster.skill || !monster.auraSkill) {
    console.error('skills not assigned');
    process.exit(1);
  }
  const DEBUFFS = ['Weaken','Sunder','Regression','SpellWeakness','ElementalWeakness'];
  if (DEBUFFS.includes(monster.skill)) {
    console.error('debuff skill assigned');
    process.exit(1);
  }
  if (!monster.stars || Object.values(monster.stars).reduce((a,b)=>a+b,0) > 9) {
    console.error('invalid star values');
    process.exit(1);
  }

  const expectedAtk = Math.floor(base.attack * 2);
  const expectedDef = Math.floor(base.defense * 2);
  const expectedHp = Math.floor(base.health * 2);
  if (monster.attack !== expectedAtk || monster.defense !== expectedDef || monster.health !== expectedHp) {
    console.error('superior stats not stronger');
    process.exit(1);
  }

  if (monster.maxMana <= elite.maxMana || monster.mana !== monster.maxMana || monster.maxMana === 0) {
    console.error('superior mana not assigned');
    process.exit(1);
  }

  const merc = convertMonsterToMercenary(monster);
  if (merc.skill !== monster.skill || merc.skill2 !== monster.auraSkill) {
    console.error('skills not kept after conversion');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
