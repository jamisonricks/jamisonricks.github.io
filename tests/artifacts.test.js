const test = require('node:test');
const assert = require('node:assert/strict');

global.window = {};
require('../js/game-data.js');
require('../js/game-utils.js');
require('../js/combatants.js');
require('../js/abilities.js');

const RPG = window.RPG;
const gameData = window.GAME_DATA;

function enemy(name) {
  return new RPG.Enemy(name, 1000, 1, 0, 0, [], null, 0, 0, 0, 0);
}

test('stat and regeneration artifacts persist and cannot be equipped twice', function () {
  const player = new RPG.Player(gameData.classes[0]);
  const other = new RPG.Player(gameData.classes[1]);
  player.equipArtifact('smoke-bomb');
  player.equipArtifact('ancient-tome');
  player.equipArtifact('band-of-life');
  assert.equal(player.getAgility(), gameData.classes[0].agility + 20);
  assert.equal(player.maxMp, gameData.classes[0].maxMp + 10);
  assert.equal(player.mp, gameData.classes[0].maxMp);
  assert.throws(function () { player.equipArtifact('ancient-tome'); }, /already has/);
  assert.throws(function () { player.equipArtifact('invalid'); }, /Unknown artifact/);
  other.equipArtifact('ancient-tome');
  assert.equal(other.maxMp, gameData.classes[1].maxMp + 10);
  player.health = 10;
  player.applyStatusEffect('healthRegeneration', 'test');
  player.processEndOfTurnEffects();
  assert.equal(player.health, 13);
  player.clearActiveEffects();
  player.resetCombatBuffs();
  player.processEndOfTurnEffects();
  assert.equal(player.health, 14.5);
  player.applyLevelGrowth();
  assert.equal(player.maxMp, gameData.classes[0].maxMp + 11);
  assert.equal(player.getAgility(), gameData.classes[0].agility + 20);
});

test('Mana Condenser scales all targets using living enemies at action start', function () {
  const player = new RPG.Player(gameData.classes[0]);
  player.attackPower = 10;
  player.dexterity = 100;
  player.equipArtifact('mana-condenser');
  const skill = new RPG.Skill(gameData.classes[0].skills[0]);
  const oldRandom = Math.random;
  Math.random = function () { return 0.5; };
  try {
    [1, 3, 5, 6].forEach(function (count) {
      const targets = Array.from({ length: count }, function (_, index) {
        return enemy(`Enemy ${index}`);
      });
      skill.use(player, targets);
      const expected = Math.floor(11 * (1 + Math.max(0, 5 - count) * 0.2));
      targets.forEach(function (target) { assert.equal(1000 - target.health, expected); });
    });
    const targets = [enemy('One'), enemy('Two'), enemy('Dead')];
    targets[2].health = 0;
    skill.use(player, targets);
    assert.equal(targets[0].health, 983);
    assert.equal(targets[1].health, 983);
    assert.match(skill.getDescription(player, enemy('Preview'), 3), /Damage: 15/);
    const single = enemy('Single');
    player.attackWithResult(single);
    assert.equal(single.health, 990);
  } finally {
    Math.random = oldRandom;
  }
});

test('Firestarter rolls per successful attack and applies a one-turn Burn', function () {
  const player = new RPG.Player(gameData.classes[0]);
  player.dexterity = 100;
  player.equipArtifact('firestarter');
  const target = enemy('Target');
  const oldRandom = Math.random;
  let rolls = [0.5, 0.9, 0.19];
  Math.random = function () { return rolls.shift(); };
  try {
    const result = player.attackWithResult(target);
    assert.equal(result.firestarterBurn, true);
    assert.match(RPG.formatAttackResult(player, target, result), /Burn \(1 turn\)/);
    const burn = target.activeEffects.find(function (effect) { return effect.effectId === 'burn'; });
    assert.equal(burn.remainingDuration, 1);
    const beforeTick = target.health;
    assert.match(target.processTurnEffects()[0], /Burn/);
    target.processEndOfTurnEffects();
    assert.equal(target.health, beforeTick - 2);
    assert.equal(target.hasActiveEffect('burn'), false);

    rolls = [0.5, 0.9, 0.2];
    assert.equal(player.attackWithResult(target).firestarterBurn, undefined);
    assert.equal(target.hasActiveEffect('burn'), false);
    player.dexterity = 0;
    target.agility = 100;
    rolls = [0];
    assert.equal(player.attackWithResult(target).hit, false);
    assert.equal(target.hasActiveEffect('burn'), false);

    player.dexterity = 100;
    target.agility = 0;
    target.applyStatusEffect('burn', 'Ember Dart');
    rolls = [0.5, 0.9, 0.19];
    player.attackWithResult(target);
    assert.deepEqual(target.activeEffects.map(function (effect) {
      return effect.remainingDuration;
    }), [3, 1]);

    const multi = [enemy('One'), enemy('Two')];
    rolls = [0.5, 0.9, 0.19, 0.5, 0.9, 0.2];
    const message = new RPG.Skill(gameData.classes[0].skills[0]).use(player, multi);
    assert.match(message, /One is afflicted with Burn/);
    assert.equal(multi[0].hasActiveEffect('burn'), true);
    assert.equal(multi[1].hasActiveEffect('burn'), false);
  } finally {
    Math.random = oldRandom;
  }
});
