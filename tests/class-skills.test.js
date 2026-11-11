const test = require('node:test');
const assert = require('node:assert/strict');

global.window = {};
require('../js/game-data.js');
require('../js/game-utils.js');
require('../js/combatants.js');
require('../js/abilities.js');

const RPG = window.RPG;
const data = window.GAME_DATA;

function player(name) {
  return new RPG.Player(data.classes.find(function (item) { return item.name === name; }));
}

function skill(name, skillName) {
  return new RPG.Skill(data.classes.find(function (item) { return item.name === name; })
    .skills.find(function (item) { return item.name === skillName; }));
}

function enemy(name) {
  return new RPG.Enemy(name, 1000, 20, 0, 1, [], null, 100, 0, 0, 0);
}

test('Bulwark reduces only the first landed attack and resets each fight', function () {
  const knight = player('Knight');
  knight.defense = 0;
  const attacker = enemy('Enemy');
  const oldRandom = Math.random;
  Math.random = function () { return 0.5; };
  try {
    knight.applyStatusEffect('burn', 'test');
    knight.processTurnEffects();
    assert.equal(knight.health, 28);
    assert.equal(knight.bulwarkReady, true);
    attacker.dexterity = -100;
    assert.equal(attacker.attackWithResult(knight).hit, false);
    assert.equal(knight.bulwarkReady, true);
    attacker.dexterity = 100;
    const first = attacker.attackWithResult(knight);
    assert.equal(first.damage, 4);
    assert.equal(first.bulwark, true);
    assert.match(RPG.formatAttackResult(attacker, knight, first), /Bulwark/);
    assert.equal(attacker.attackWithResult(knight).damage, 20);
    knight.resetCombatBuffs();
    assert.equal(knight.bulwarkReady, true);
    knight.defend();
    assert.equal(attacker.attackWithResult(knight).damage, 3);
    knight.resetCombatBuffs();
    assert.equal(knight.isDefending, false);
  } finally {
    Math.random = oldRandom;
  }
});

test('Taunt raises defense and weighted targeting for three turns', function () {
  const knight = player('Knight');
  const archer = player('Archer');
  knight.defense = 8;
  const taunt = skill('Knight', 'Taunt');
  assert.equal(taunt.mpCost, 3);
  knight.useSkill(taunt, [knight]);
  assert.equal(knight.mp, 5);
  assert.equal(knight.getDefense(), 10);
  assert.equal(knight.getHate(), 3);
  const oldRandom = Math.random;
  try {
    Math.random = function () { return 0.74; };
    assert.equal(RPG.chooseEnemyTarget([knight, archer]), knight);
    Math.random = function () { return 0.75; };
    assert.equal(RPG.chooseEnemyTarget([knight, archer]), archer);
    knight.health = 0;
    assert.equal(RPG.chooseEnemyTarget([knight, archer]), archer);
    archer.health = 0;
    assert.equal(RPG.chooseEnemyTarget([knight, archer]), null);
  } finally {
    Math.random = oldRandom;
  }
  knight.health = 30;
  knight.processEndOfTurnEffects();
  for (let turn = 0; turn < 2; turn += 1) {
    assert.equal(knight.getHate(), 3);
    knight.processEndOfTurnEffects();
  }
  assert.equal(knight.getHate(), 3);
  knight.processEndOfTurnEffects();
  assert.equal(knight.getHate(), 1);
  assert.equal(knight.getDefense(), 8);
});

test('Detect reduces enemy agility by 10 for three turns and improves accuracy', function () {
  const archer = player('Archer');
  const target = enemy('Target');
  target.agility = 20;
  const before = archer.getHitChance(target);
  const detect = skill('Archer', 'Detect');
  assert.equal(detect.mpCost, 2);
  archer.useSkill(detect, [target]);
  assert.equal(archer.mp, 7);
  assert.equal(target.getAgility(), 10);
  assert.ok(Math.abs(archer.getHitChance(target) - before - 0.3) < 1e-10);
  for (let turn = 0; turn < 2; turn += 1) target.tickActiveEffects();
  assert.equal(target.getAgility(), 10);
  target.tickActiveEffects();
  assert.equal(target.getAgility(), 20);
});

test('Geo Catastrophe rolls Tremor independently per hit and spends 11 MP', function () {
  const mage = player('Mage');
  mage.dexterity = 100;
  const targets = [enemy('First'), enemy('Second'), enemy('Missed')];
  targets[2].agility = 200;
  const geo = skill('Mage', 'Geo Catastrophe');
  assert.equal(geo.mpCost, 11);
  assert.equal(mage.canUseSkill(geo), true);
  const oldRandom = Math.random;
  const rolls = [0.5, 0.5, 0.29, 0.5, 0.5, 0.3, 0.5];
  Math.random = function () { return rolls.shift(); };
  try {
    const message = mage.useSkill(geo, targets);
    assert.equal(mage.mp, 0);
    assert.match(message, /First is afflicted with Tremor/);
    assert.match(message, /Missed dodged/);
    assert.equal(targets[0].hasActiveEffect('tremor'), true);
    assert.equal(targets[1].hasActiveEffect('tremor'), false);
    assert.equal(targets[2].hasActiveEffect('tremor'), false);
    assert.equal(targets[0].health, 985);
    assert.equal(targets[0].getDamageResult(20, 'normal', false).damage, 25);
    targets[0].applyStatusEffect('damageTakenIncrease', 'test');
    assert.equal(targets[0].getDamageResult(20, 'normal', false).damage, 31);
    for (let turn = 0; turn < 3; turn += 1) targets[0].tickActiveEffects();
    assert.equal(targets[0].incomingDamageMultiplier, 1);
  } finally {
    Math.random = oldRandom;
  }
});
