const test = require('node:test');
const assert = require('node:assert/strict');

global.window = {};
require('../js/game-data.js');
require('../js/game-utils.js');
require('../js/combatants.js');
require('../js/abilities.js');

const gameData = window.GAME_DATA;
const RPG = window.RPG;

function createEnemy(name = 'Enemy') {
  return new RPG.Enemy(name, 100, 1, 0, 0, [], null, 10, 0, 0, 5);
}

function createTarget() {
  return new RPG.Combatant('Target', 100, 1, 0, 10, 0, 0, 5);
}

test('all skills reference valid centralized effect definitions', function () {
  const skills = gameData.classes.flatMap(function (gameClass) {
    return gameClass.skills;
  }).concat(gameData.levelUpSkills);

  skills.forEach(function (definition) {
    assert.ok(['Damage', 'Buff', 'Debuff'].includes(definition.category), definition.name);
    new RPG.Skill(definition);
  });
  Object.keys(gameData.statusEffects).forEach(function (effectId) {
    assert.equal(gameData.statusEffects[effectId].id, effectId);
  });

  assert.equal(gameData.statusEffects.windShear.damage, 3);
  assert.equal(gameData.statusEffects.windShear.duration, 3);
  assert.equal(gameData.statusEffects.burn.damage, 2);
  assert.equal(gameData.statusEffects.burn.duration, 3);

  const archer = new RPG.Player(gameData.classes.find(function (gameClass) {
    return gameClass.name === 'Archer';
  }));
  const enemy = createEnemy();
  ['Storm Arrow', 'Ember Dart'].forEach(function (name) {
    const skillDefinition = skills.find(function (skill) {
      return skill.name === name;
    });
    archer.guaranteedAttackReady = true;
    new RPG.Skill(skillDefinition).use(archer, enemy);
  });
  assert.equal(enemy.hasActiveEffect('windShear'), true);
  assert.equal(enemy.hasActiveEffect('burn'), true);
});

test('damage skills log their use once and describe DOT application', function () {
  const archer = new RPG.Player(gameData.classes.find(function (gameClass) {
    return gameClass.name === 'Archer';
  }));
  const stormArrow = new RPG.Skill(gameData.classes.find(function (gameClass) {
    return gameClass.name === 'Archer';
  }).skills.find(function (skill) {
    return skill.name === 'Storm Arrow';
  }));
  const hitTarget = createEnemy();
  archer.guaranteedAttackReady = true;
  const hitMessage = stormArrow.use(archer, hitTarget);
  assert.equal((hitMessage.match(/Archer used Storm Arrow/g) || []).length, 1);
  assert.match(hitMessage, /Enemy took \d+ damage/);
  assert.match(hitMessage, /Enemy is afflicted with Wind Shear/);

  const oldRandom = Math.random;
  Math.random = function () { return 0.99; };
  let missMessage;
  try {
    const evasiveEnemy = createEnemy();
    evasiveEnemy.agility = 10;
    missMessage = stormArrow.use(archer, evasiveEnemy);
  } finally {
    Math.random = oldRandom;
  }
  assert.equal((missMessage.match(/Archer used Storm Arrow/g) || []).length, 1);
  assert.match(missMessage, /Enemy dodged the attack/);
  assert.doesNotMatch(missMessage, /afflicted/);
});

test('multiple DOT effects tick together, refresh by source, and expire', function () {
  const enemy = createEnemy();
  enemy.attackChance = 1;
  const target = createTarget();
  const oldRandom = Math.random;
  Math.random = function () { return 0.5; };
  try {
    enemy.applyStatusEffect('windShear', 'Storm Arrow');
    const firstTurn = enemy.takeTurn(target);
    const attackMessageIndex = firstTurn.messages.findIndex(function (message) {
      return message.includes('attacks Target');
    });
    const damageOverTimeMessageIndex = firstTurn.messages.findIndex(function (message) {
      return message.includes('damage from Wind Shear');
    });
    assert.ok(attackMessageIndex >= 0);
    assert.ok(damageOverTimeMessageIndex > attackMessageIndex);
    assert.equal(enemy.activeEffects[0].remainingDuration, 2);

    enemy.applyStatusEffect('windShear', 'Storm Arrow');
    enemy.applyStatusEffect('burn', 'Ember Dart');
    assert.equal(enemy.activeEffects.length, 2);
    assert.equal(enemy.activeEffects.find(function (effect) {
      return effect.effectId === 'windShear';
    }).remainingDuration, 3);

    enemy.takeTurn(target);
    enemy.takeTurn(target);
    enemy.takeTurn(target);
  } finally {
    Math.random = oldRandom;
  }
  assert.equal(enemy.health, 82);
  assert.equal(enemy.activeEffects.length, 0);
});

test('status modifiers affect combat and expire by duration', function () {
  const source = new RPG.Combatant('Source', 100, 10, 0, 100, 4, 0, 5);
  const target = new RPG.Combatant('Target', 100, 1, 0, 10, 0, 0, 5);
  source.applyStatusEffect('damageDecrease', 'Weaken');
  target.applyStatusEffect('damageTakenIncrease', 'Brittle Armor');

  const randomValues = [0.1, 0.99];
  const oldRandom = Math.random;
  Math.random = function () { return randomValues.shift(); };
  let result;
  try {
    result = source.attackWithResult(target);
  } finally {
    Math.random = oldRandom;
  }
  assert.equal(result.damage, 9);

  source.applyStatusEffect('attackIncrease', 'Battle Cry');
  source.applyStatusEffect('attackIncrease', 'Battle Cry');
  assert.equal(source.getAttackPower(), 15);
  assert.equal(source.activeEffects.filter(function (effect) {
    return effect.effectId === 'attackIncrease';
  }).length, 2);

  source.applyStatusEffect('speedIncrease', 'test');
  source.applyStatusEffect('agilityIncrease', 'test');
  source.applyStatusEffect('dexterityIncrease', 'test');
  assert.ok(source.getSpeed() > source.speed);
  assert.ok(source.getAgility() > source.agility);
  assert.ok(source.getDexterity() > source.dexterity);

  const timedEffect = new RPG.Combatant('Timed', 100, 1, 0);
  timedEffect.applyStatusEffect('damageDecrease', 'Weaken');
  for (let turn = 0; turn < 3; turn += 1) timedEffect.tickActiveEffects();
  assert.equal(timedEffect.hasActiveEffect('damageDecrease'), false);
  assert.equal(timedEffect.outgoingDamageMultiplier, 1);
});

test('Blind lowers effective dexterity by 10 until it expires', function () {
  const combatants = [
    new RPG.Player(gameData.classes[0]),
    createEnemy(),
  ];
  const target = new RPG.Combatant('Target', 100, 1, 0, 0, 5);
  combatants.forEach(function (combatant) {
    combatant.dexterity = 12;
    combatant.applyStatusEffect('dexterityIncrease', 'boost');
    assert.equal(combatant.getDexterity(), 15);
    const originalChance = combatant.getHitChance(target);
    combatant.applyStatusEffect('blind', 'first source');
    combatant.applyStatusEffect('blind', 'second source');
    assert.equal(combatant.getDexterity(), 5);
    assert.ok(Math.abs(combatant.getHitChance(target) - (originalChance - 0.25)) < 1e-10);
    assert.match(combatant.getActiveEffectSummary(), /Blind \(3 turns\)/);
    combatant.tickActiveEffects();
    combatant.tickActiveEffects();
    assert.equal(combatant.getDexterity(), 5);
    combatant.tickActiveEffects();
    assert.equal(combatant.getDexterity(), 12);
    assert.equal(combatant.hasActiveEffect('blind'), false);

    combatant.dexterity = 6;
    combatant.applyStatusEffect('blind', 'first source');
    assert.equal(combatant.getDexterity(), -4);
    combatant.clearActiveEffects();
    assert.equal(combatant.getDexterity(), 6);
  });
});

test('sleep wakes when damaged and stun consumes one enemy turn', function () {
  const oldRandom = Math.random;
  const caster = new RPG.Player(gameData.classes.find(function (gameClass) {
    return gameClass.name === 'Mage';
  }));
  const sleeping = createEnemy('Sleeping');
  Math.random = function () { return 0; };
  try {
    const sleepSkill = new RPG.Skill(gameData.levelUpSkills.find(function (skill) {
      return skill.name === 'Sleep';
    }));
    sleepSkill.use(caster, sleeping);
  } finally {
    Math.random = oldRandom;
  }
  assert.match(sleeping.takeTurn(createTarget()).messages.join(' '), /asleep and cannot act/);
  assert.equal(sleeping.activeEffects.find(function (effect) {
    return effect.effectId === 'sleep';
  }).remainingDuration, 2);
  assert.equal(sleeping.getDamageResult(1, 'normal').effectiveness, 'sleep');
  assert.equal(sleeping.hasActiveEffect('sleep'), false);

  const stunned = createEnemy('Stunned');
  caster.mp = 21;
  caster.dexterity = 100;
  const randomValues = [0.1, 0.99];
  Math.random = function () { return randomValues.shift(); };
  try {
    const magicBurst = new RPG.Skill(gameData.levelUpSkills.find(function (skill) {
      return skill.name === 'Magic Burst';
    }));
    magicBurst.use(caster, stunned);
  } finally {
    Math.random = oldRandom;
  }
  assert.equal(stunned.hasActiveEffect('stun'), true);
  assert.match(stunned.takeTurn(createTarget()).messages.join(' '), /stunned and cannot act/);
  assert.equal(stunned.hasActiveEffect('stun'), false);
});

test('Channel Aether applies and expires its regeneration and cost effects', function () {
  const player = new RPG.Player(gameData.classes[0]);
  player.health = 10;
  player.mp = 0;
  const channelAether = new RPG.Skill(gameData.levelUpSkills.find(function (skill) {
    return skill.name === 'Channel Aether';
  }));
  const heal = new RPG.Skill(gameData.classes[0].skills.find(function (skill) {
    return skill.name === 'Heal';
  }));
  assert.equal(player.getSkillCost(heal), 3);
  channelAether.use(player, player);

  assert.equal(player.spellCostReduction, 1);
  assert.equal(player.getSkillCost(heal), 2);
  assert.equal(player.getSkillCost({ mpCost: 0, additionalEffects: [] }), 0);
  player.mp = 8;
  player.useSkill(heal, player);
  assert.equal(player.mp, 6);
  player.health = 10;
  assert.equal(player.healthRegenerationPercent, 0.05);
  for (let turn = 0; turn < 3; turn += 1) player.processEndOfTurnEffects();
  assert.equal(player.health, 10 + player.maxHealth * 0.05 * 3);
  assert.equal(player.spellCostReduction, 1);
  player.processEndOfTurnEffects();
  assert.equal(player.spellCostReduction, 0);
  assert.equal(player.getSkillCost(heal), 3);
  assert.equal(player.healthRegenerationPercent, 0);
});
