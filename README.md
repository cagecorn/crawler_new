# Dungeon Crawler Game

This project is a lightweight browser-based dungeon crawler. It lets players explore levels, battle enemies and gather loot directly in the browser.

## Playing

Open `index.html` in a modern web browser to start the game. The player now begins with every available skill already learned, so no class selection is required.

```bash
npx http-server
```

Running a small HTTP server from the project directory is recommended because some browsers block
ES module loading when opening the file directly via `file://`. You can still open `index.html`
without a server, but you may need to adjust browser settings to permit local module imports.

### Dungeon Generation
Each floor is carved from a depth-first search maze. Corridors span seven tiles,
and the exit is placed on a randomly chosen cell that the algorithm visited.

### Monster Progression

As you descend the dungeon, tougher monsters appear on each floor.

- **Floors 1-2** – Goblins, Goblin Archers, Goblin Wizards and Zombies.
- **Floors 3-4** – Skeletons, Skeleton Mages and Orcs (with Orc Archers).
- **Floors 5-6** – Trolls begin to appear alongside Orcs and Skeleton Mages.
- **Floors 7-8** – Dark Mages join the mix with Trolls and Orcs.
- **Floors 9-10** – Demon Warriors lead groups of Dark Mages and Orcs.
- **Beyond floor 10** – ELEMENTAL_GOLEM and other high-level foes may appear.

The full roster of monsters appears on progressively higher floors as defined in
`getMonsterPoolForFloor` in [src/mechanics.js](src/mechanics.js):

- **SLIME** – A weak blob that slowly slides toward the player.
- **KOBOLD** – Crafty scavenger that often attacks in packs.
- **GARGOYLE** – Stone guardian with tough defenses.
- **BANSHEE** – Ethereal spirit whose wail saps life.
- **MINOTAUR** – Brutish beast that charges headfirst.
- **LICH** – Undead sorcerer capable of strong magic.
- **DRAGON_WHELP** – Young dragon with a small but fiery breath.
- **ELEMENTAL_GOLEM** – Massive construct empowered by elemental forces.

### Controls

- Use the arrow keys or on-screen arrows to move your character.
- Press `Z` (or `F`) or click **Attack** to strike the nearest monster.
- Number keys `1`-`9` open the details of each hired mercenary.
- Use the BGM buttons at the top of the page to switch tracks or mute the background music.
- Additional actions such as **Heal**, **Recall**, **Skill1** and **Skill2** are available via the action buttons. You can also use `X` for **Skill1**, `C` for **Skill2**, `V` for **Ranged** attack and `A` to recall your mercenaries.

### Audio

The game uses the Web Audio API for sound effects and plays background music through the `bgm-player` element.
At the top of the page are three BGM controls:
- **prev-bgm** – play the previous track
- **toggle-bgm** – mute or unmute music
- **next-bgm** – play the next track

Audio is not initialized until you interact with the page. The first click or key press runs `initializeAudio()` which starts the sound engine and begins playback.
When tests run under jsdom, audio initialization is skipped so no sound plays.

### Hiring Mercenaries

Click the buttons in the *Hire Mercenary* panel to recruit warriors, archers, healers or wizards. Each mercenary costs gold and appears near the player. You may have up to five mercenaries at a time; when full you will be prompted to replace an existing ally.

### Shop and Skill System

Spend collected gold in the shop to purchase items. Bought gear is placed in your inventory and can boost your stats when equipped. All skills are unlocked from the start and can be assigned to the **Skill1** and **Skill2** slots.
When defining skills, include a numeric `cooldown` property. Passive or always-available skills should set it to `0`.

### Mercenary Skills

Each mercenary receives one random skill upon hiring. Using that skill costs the
mercenary's mana, and the skill's name and icon show up in the combat log when
activated. You can see the assigned skill and its mana cost in the mercenary's
detail panel and in the side list by their portrait. Open a mercenary's detail
panel with the corresponding number key (`1`-`9`) or by clicking their portrait
in the UI.

### Bard Mercenaries

Bards are support units that join with songs ready to boost the party. Each bard
comes with one of two skill sets:

- **Heal** + **Guardian Hymn**
- **Heal** + **Courage Hymn**

These hymns play `auraActivateMinor` or `auraActivateMajor` sound cues when
activated, letting you know their protective or offensive effects are in play.


### Mercenary Traits

*This system has been removed.* Mercenaries no longer receive random traits or related bonuses.

### Mercenary Affinity (호감도 시스템)

Mercenaries and revived monsters track an *affinity* value that measures their
loyalty to the party.

- Newly hired mercenaries start with **50** affinity.
- Revived monsters start with **30** affinity.
- Affinity rises by **0.01** each turn a unit stays in your party and caps at **200**.
- When a mercenary dies they lose **5** affinity. If their affinity drops to zero
  they permanently leave your party.

You can view a unit's current affinity by opening their detail window. The value
appears near the top of the stats panel.

#### Food and Cooking

Food items increase affinity. Simple drops like **Bread** provide small bonuses
(+3 affinity), while cooked dishes from the **Crafting** tab grant larger
amounts. For example, combining Bread, Meat and Lettuce into a **Sandwich** yields
**+3** affinity and fullness.

Ingredient items and cooking recipes drop randomly during exploration and are
stored as crafting materials rather than in your main inventory.

### Elite Monsters and Auras

Each dungeon floor now contains at least one **elite** monster. Elites boast higher stats and randomly receive an aura skill that benefits nearby allies. When an elite is revived as a mercenary, it keeps this aura skill. Elites display a red glow and the "엘리트" prefix. Champions glow yellow, and superior monsters glow blue.

#### Superior Rank

Superior elites are a planned upgrade to normal elites. They carry two aura skills and gain strength through a star-based system. They are not yet part of the regular dungeon spawns.

### Incubators

Incubators let you hatch monster eggs into powerful allies. Place an egg from your inventory into an empty slot to start the process. Each egg shows how many turns remain until hatching. At the start of every turn the counter decreases. When an egg reaches zero, the hatched superior is moved to the waiting list. Recruit them from there to add the new mercenary to your party.


### Loot

Recipe scrolls may drop from monsters or appear in dungeons. Picking one up automatically adds the recipe to your known list. Duplicate scrolls are ignored once learned.

### Monster Farming

You can now cultivate monsters for equipment. Bury a defeated foe on a farm tile to start growing loot. The monster slowly decomposes over a set number of turns. Using fertilizer items reduces this time or improves the drop quality. When the growth is complete, harvest the plot to receive equipment influenced by the planted monster.

### Equipment Enhancement

Gear can be leveled up using materials like **iron** and **bone**. Each enhancement level adds **+1** to attack and defense, **+0.5** to other non-resistance stats, and **+0.01** to resistance stats. Press the **강화** button beside an item in your inventory to spend the materials and apply the upgrade. Players now begin the game with **100** iron and **100** bone so you can enhance equipment right away.
Each attempt has a 20% chance to fail, which still consumes the materials but does not increase the item's level.

### Disassembling Gear

Equipment can be broken down for extra materials. Click the **분해** button next to a weapon, armor or accessory to dismantle it. You gain both **iron** and **bone** equal to the item's base level plus its enhancement level. The item is removed from your inventory after disassembly.


### Leeching and Vampirism Bonuses

Some equipment suffixes grant special `killHealth` or `killMana` modifiers. Gear with the **Leeching** suffix restores health to whoever lands the killing blow, while the **Vampirism** suffix replenishes mana on a kill. These bonuses provide a steady trickle of recovery as you defeat enemies.

### Special Tiles

Dungeon floors contain several interactive tiles:

- **Treasure Chests** scatter 1–5 random items around them when opened.
- **Mines** grant large amounts of **iron**.
- **Trees** provide plenty of **wood**.
- **Bone Piles** yield lots of **bone**.
- **Temples** come in three colors and either fully heal the party, restore fullness or raise affinity by 10. Each temple disappears after use.
- **Graves** present a risky challenge. Accepting it spawns monsters but rewards high level items, materials and gold.

### Map Items and Altars

Map items occasionally drop from monsters and chests. Each map lists a modifier that alters the next floor, such as boosting treasure or increasing monster spawns. Every five floors a glowing map altar appears in the dungeon. Stand on the altar and activate a map from your inventory to apply its modifier – maps only work when used while positioned on these altars.

## Development

Install dependencies with:

```bash
npm install
```

The core `gameState` object used throughout the game is created in
[`src/state.js`](src/state.js) and is attached to the global object so
other modules such as `src/mechanics.js` can access it directly.

## Testing

The test suite relies on development dependencies such as **jsdom**. Ensure they
are installed by running:

```bash
npm install
```

You can simply run `npm test` as well – the `pretest` script in
`package.json` automatically installs all dependencies before executing the test
runner. After installation the test runner
automatically locates all files ending with `*.test.js` in the `tests` folder
and executes them sequentially.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Contributing

Pull requests and issues are welcome. Please follow common open source etiquette when proposing changes.
