const test = require('node:test');
const assert = require('node:assert/strict');

global.window = {};
require('../js/game-data.js');
require('../js/game-utils.js');
require('../js/combatants.js');
require('../js/abilities.js');

const gameData = window.GAME_DATA;
const RPG = window.RPG;

test('players have no gear upgrade levels', function () {
  const player = new RPG.Player(gameData.classes[0]);
  assert.equal(Object.hasOwn(player, 'weaponLevel'), false);
  assert.equal(Object.hasOwn(player, 'armorLevel'), false);
});

test('encounters start with the Precursor and select a different random boss', function () {
  const first = RPG.createBoss(0);
  const next = RPG.createBoss(1, first.id);
  assert.equal(first.name, 'The Precursor');
  assert.equal(first.icon, 'X-x');
  assert.equal(first.health, 80);
  assert.equal(next.name, 'The Executioner');
  const later = RPG.createBoss(2, next.id);
  assert.equal(later.name, first.name);
  assert.ok(later.maxHealth > first.maxHealth);
  assert.ok(later.attackPower > first.attackPower);
  assert.ok(later.attackChance > first.attackChance);
  assert.ok(next.maxHealth > RPG.createBoss(1, next.id).maxHealth);

  const another = Object.assign({}, gameData.bosses[0], { id: 'another', name: 'Another Boss' });
  gameData.bosses.push(another);
  const oldRandom = Math.random;
  try {
    Math.random = function () { return 0; };
    assert.equal(RPG.createBoss(1, first.id).name, 'The Executioner');
    Math.random = function () { return 0.99; };
    assert.equal(RPG.createBoss(1, first.id).name, 'Another Boss');
    assert.equal(RPG.createBoss(0, first.id).name, 'The Precursor');
  } finally {
    Math.random = oldRandom;
    gameData.bosses.pop();
  }
});

test('enemy attack chance scales past 90% and is capped when taking a turn', function () {
  const boss = RPG.createBoss(20, 'executioner');
  assert.ok(boss.attackChance > 1);
  boss.takeDamage(boss.maxHealth / 2);
  const reinforcement = boss.takeReinforcements()[0];
  assert.ok(reinforcement.attackChance > 1);
  const target = new RPG.Combatant('Target', 100, 1, 0);
  const oldRandom = Math.random;
  try {
    Math.random = function () { return 0.99; };
    assert.equal(boss.takeTurn(target).attacked, true);
    assert.equal(reinforcement.takeTurn(target).attacked, true);
    boss.attackChance = 0.9;
    assert.equal(boss.takeTurn(target).attacked, false);
    boss.attackChance = 0;
    Math.random = function () { return 0; };
    assert.equal(boss.takeTurn(target).attacked, false);
  } finally {
    Math.random = oldRandom;
  }
});

test('hit chance uses attacker dexterity and target agility with bounds', function () {
  const attacker = new RPG.Combatant('Attacker', 100, 1, 0, 10);
  const target = new RPG.Combatant('Target', 100, 1, 0, 0, 10);
  assert.equal(attacker.getHitChance(target), 0.75);
  target.agility = 5;
  assert.equal(attacker.getHitChance(target), 0.9);
  target.agility = 33;
  assert.ok(Math.abs(attacker.getHitChance(target) - 0.06) < 1e-10);
  target.agility = 50;
  assert.equal(attacker.getHitChance(target), 0);
  const oldRandom = Math.random;
  Math.random = function () { return 0; };
  try {
    assert.equal(attacker.attackWithResult(target).hit, false);
    assert.equal(attacker.attackWithResult(target, 0, 0, 'normal', true).hit, true);
  } finally {
    Math.random = oldRandom;
  }
  target.agility = 0;
  assert.equal(attacker.getHitChance(target), 1);
  const random = Math.random;
  Math.random = function () { return 0.99; };
  try {
    assert.equal(attacker.attackWithResult(target).hit, true);
  } finally {
    Math.random = random;
  }
});

test('the boss calls two scaled reinforcements once at half health', function () {
  const boss = RPG.createBoss(0);
  boss.takeDamage(39);
  assert.deepEqual(boss.takeReinforcements(), []);
  boss.takeDamage(1);
  const reinforcements = boss.takeReinforcements();
  assert.equal(reinforcements.length, 2);
  assert.deepEqual(reinforcements.map(function (enemy) { return enemy.name; }), [
    'Precursor Reinforcement 1', 'Precursor Reinforcement 2'
  ]);
  assert.ok(reinforcements.every(function (enemy) { return enemy.isAlive(); }));
  boss.heal(20);
  boss.takeDamage(30);
  assert.deepEqual(boss.takeReinforcements(), []);

  const laterBoss = RPG.createBoss(1, 'executioner');
  laterBoss.takeDamage(laterBoss.maxHealth);
  const laterReinforcements = laterBoss.takeReinforcements();
  assert.equal(laterReinforcements.length, 2);
  assert.ok(laterReinforcements[0].maxHealth > reinforcements[0].maxHealth);
  assert.deepEqual(laterBoss.takeReinforcements(), []);
});

test('damage over time can trigger reinforcements', function () {
  const boss = RPG.createBoss(0);
  boss.takeDamage(38);
  boss.applyStatusEffect('burn', 'test');
  boss.processTurnEffects();
  assert.equal(boss.health, 40);
  assert.equal(boss.takeReinforcements().length, 2);
});

test('Executioner can attack one member or the whole party', function () {
  const boss = RPG.createBoss(1, 'precursor');
  boss.attackChance = 1;
  boss.dexterity = 100;
  const knight = new RPG.Player(gameData.classes[0]);
  const mage = new RPG.Player(gameData.classes[2]);
  knight.bulwarkReady = false;
  const oldRandom = Math.random;
  let rolls = [0.1, 0.1, 0.5, 0.5];
  Math.random = function () { return rolls.shift(); };
  try {
    let result = boss.takeTurn(knight, [knight, mage]);
    assert.equal(result.attacked, true);
    assert.ok(knight.health < knight.maxHealth);
    assert.equal(mage.health, mage.maxHealth);
    rolls = [0.1, 0.5, 0.5, 0.5, 0.5, 0.5];
    result = boss.takeTurn(knight, [knight, mage]);
    assert.match(result.messages.join(' '), /entire party/);
    assert.ok(mage.health < mage.maxHealth);
    assert.equal(result.messages.filter(function (message) {
      return message.includes('attacks');
    }).length, 3);
  } finally {
    Math.random = oldRandom;
  }
});

test('execution is telegraphed, delayed by stun, and deals current HP unless defended', function () {
  const boss = RPG.createBoss(1, 'precursor');
  boss.attackChance = 1;
  const knight = new RPG.Player(gameData.classes[0]);
  const mage = new RPG.Player(gameData.classes[2]);
  const oldRandom = Math.random;
  let rolls = [0.1, 0.9];
  Math.random = function () { return rolls.shift(); };
  try {
    const warning = boss.takeTurn(knight, [knight, mage]);
    assert.equal(warning.attacked, false);
    assert.match(warning.messages.join(' '), /prepares to execute Knight/);
    assert.equal(knight.health, knight.maxHealth);
    boss.applyStatusEffect('stun', 'test');
    assert.match(boss.takeTurn(mage, [knight, mage]).messages.join(' '), /stunned/);
    assert.match(boss.getExecutionWarning(), /Knight/);
    knight.health = 15;
    knight.incomingDamageMultiplier = 0.5;
    const execution = boss.takeTurn(mage, [knight, mage]);
    assert.match(execution.messages.join(' '), /executes Knight for 15 damage/);
    assert.equal(knight.health, 0);
    assert.equal(knight.bulwarkReady, true);
    assert.equal(boss.getExecutionWarning(), '');
    assert.equal(mage.health, mage.maxHealth);

    rolls = [0.1, 0.9];
    boss.takeTurn(mage, [mage]);
    mage.health = 1;
    const defended = boss.takeTurn(mage, [mage], [mage]);
    assert.match(defended.messages.join(' '), /defended/);
    assert.equal(mage.health, 1);
    assert.equal(boss.executionTarget, null);

    rolls = [0.1, 0.9];
    boss.takeTurn(mage, [mage]);
    mage.health = 0;
    knight.health = 10;
    assert.match(boss.takeTurn(knight, [knight, mage]).messages.join(' '), /already defeated/);
    assert.equal(knight.health, 10);
  } finally {
    Math.random = oldRandom;
  }
});

class Element {
  constructor(tagName = 'div') {
    this.tagName = tagName;
    this.children = [];
    this.hidden = false;
    this.dataset = {};
    this.style = {};
    this.listeners = {};
    this.classList = {
      add() {},
      remove() {},
      toggle() {},
    };
    this.textContent = '';
  }
  appendChild(child) { this.children.push(child); return child; }
  replaceChildren() { this.children = []; this.textContent = ''; }
  addEventListener(type, callback) { this.listeners[type] = callback; }
  setAttribute() {}
  click() {
    assert.ok(this.listeners.click, `No click listener for ${this.textContent}`);
    this.listeners.click();
  }
  get lastElementChild() { return this.children[this.children.length - 1]; }
  querySelectorAll(selector) {
    return this.children.filter(function (child) { return child.tagName === selector; });
  }
  querySelector(selector) {
    const match = selector.match(/^\[data-shop-tab="(.+)"\]$/);
    return this.children.find(function (child) { return match && child.dataset.shopTab === match[1]; });
  }
}

test('combat waits for reinforcements and preserves preparation and shop between bosses', function () {
  const elements = {};
  global.document = {
    getElementById(id) {
      if (!elements[id]) {
        elements[id] = new Element();
        elements[id].id = id;
        elements[id].hidden = [
          'battlefield', 'class-selection', 'combat-actions', 'skill-list',
          'combat-item-list', 'combat-stats', 'target-list', 'level-up', 'artifact-chest', 'shop',
          'preparation', 'preparation-panel', 'share-button'
        ].includes(id);
      }
      return elements[id];
    },
    createElement(tagName) { return new Element(tagName); },
    addEventListener(type, callback) {
      assert.equal(type, 'DOMContentLoaded');
      callback();
    },
  };
  const oldRandom = Math.random;
  const createBoss = RPG.createBoss;
  const OriginalPlayer = RPG.Player;
  const firstLevelXp = gameData.progression.firstLevelXp;
  const party = [];
  RPG.Player = class extends OriginalPlayer {
    constructor(classData) {
      super(classData);
      party.push(this);
    }
  };
  let boss;
  RPG.createBoss = function (level, previousBossId) {
    boss = createBoss(level, previousBossId);
    boss.attackChance = 0;
    return boss;
  };
  Math.random = function () { return 0.5; };
  try {
    require('../js/main.js');
    elements['start-game'].click();
    elements['class-selection'].children[0].click();
    elements['class-selection'].children[1].click();
    elements['class-selection'].lastElementChild.click();
    assert.equal(elements.battlefield.children[0].children.length, 1);
    assert.equal(elements.battlefield.children[0].children[0].children[0].textContent, 'X-x');
    assert.match(elements['game-log'].children[1].textContent, /The Precursor appears/);

    boss.health = 41;
    function attack(targetIndex) {
      elements['attack-button'].click();
      elements['target-list'].children[targetIndex].click();
    }
    attack(0);
    attack(0);
    assert.equal(elements.battlefield.children[0].children.length, 3);
    assert.match(elements['game-log'].children.map(function (line) {
      return line.textContent;
    }).join(' '), /calls 2 reinforcements/);
    assert.doesNotMatch(elements['game-log'].children.map(function (line) {
      return line.textContent;
    }).join(' '), /Precursor Reinforcement \d attacks/);
    assert.equal(elements.preparation.hidden, true);

    boss.health = 1;
    const enemyRow = elements.battlefield.children[0];
    assert.equal(enemyRow.children[1].children[0].textContent, 'x');
    attack(0);
    attack(0);
    assert.equal(elements.preparation.hidden, true);
    assert.equal(elements['combat-actions'].hidden, false);

    // Defeat the remaining reinforcements through the regular targeting UI.
    while (!elements['combat-actions'].hidden) {
      attack(0);
      attack(0);
    }
    ['Knight', 'Archer'].forEach(function (className) {
      assert.equal(elements['level-up'].hidden, false);
      assert.equal(elements['level-up'].children[0].tagName, 'h3');
      assert.equal(elements['level-up'].children[0].textContent, `${className}: choose a skill`);
      elements['level-up'].children[1].click();
    });
    assert.equal(elements['level-up'].hidden, true);
    assert.equal(elements['artifact-chest'].hidden, false);
    assert.equal(elements['artifact-chest'].children.length, 4);
    const choices = elements['artifact-chest'].children.slice(1).map(function (button) {
      return button.textContent;
    });
    assert.equal(new Set(choices).size, 3);
    elements['artifact-chest'].children[1].click();
    assert.match(elements['artifact-chest'].children[0].textContent, /choose a party member/);
    elements['artifact-chest'].lastElementChild.click();
    assert.deepEqual(elements['artifact-chest'].children.slice(1).map(function (button) {
      return button.textContent;
    }), choices);
    elements['artifact-chest'].children[1].click();
    elements['artifact-chest'].children[1].click();
    assert.equal(elements.preparation.hidden, false);
    assert.equal(elements['artifact-chest'].hidden, true);
    assert.match(elements['game-status'].lastElementChild.textContent, /Score: 1/);
    elements['artifacts-button'].click();
    assert.match(elements['preparation-panel'].children[1].textContent, new RegExp(choices[0]));
    assert.match(elements['preparation-panel'].lastElementChild.textContent, /No artifacts/);
    elements['inventory-button'].click();
    assert.equal(elements['preparation-panel'].hidden, false);
    elements['preparation-panel'].children[0].click();
    elements['preparation-panel'].children[1].click();
    assert.match(elements['game-log'].children[0].textContent, /uses a Health Potion/);
    elements['shop-button'].click();
    assert.equal(elements.shop.hidden, false);
    assert.deepEqual(elements.shop.children[0].children.map(function (tab) {
      return tab.textContent;
    }), ['Consumables', 'Learn Skill', 'Recruit']);
    elements.shop.children[1].children[0].click();
    assert.match(elements['game-log'].children[0].textContent, /Purchased Health Potion/);
    elements.shop.children[0].children[1].click();
    assert.match(elements.shop.children[1].children[0].textContent, /Select a party member/);
    elements.shop.children[0].children[2].click();
    assert.match(elements.shop.children[1].children[0].textContent, /Knight/);
    elements.shop.lastElementChild.click();
    assert.equal(elements.preparation.hidden, false);
    elements['stats-button'].click();
    assert.match(elements['preparation-panel'].children[0].textContent, /Attack .*Defense/);
    assert.doesNotMatch(elements['preparation-panel'].children[0].textContent, /Weapon Lv|Armor Lv/);
    elements['next-combat-button'].click();
    assert.equal(boss.name, 'The Executioner');
    assert.equal(boss.maxHealth, 220);
    assert.equal(elements.battlefield.children[0].children.length, 1);
    assert.equal(elements.battlefield.children[0].children[0].children[0].textContent, 'X');

    // The warning survives action selection, and defending works even if the boss is faster.
    boss.attackChance = 1;
    boss.speed = 100;
    Math.random = function () { return 0.9; };
    elements['defend-button'].click();
    elements['defend-button'].click();
    assert.match(elements['game-log'].children.map(function (line) {
      return line.textContent;
    }).join(' '), /prepares to execute Archer/);
    assert.match(elements['party-turn-list'].children[0].textContent, /execute Archer/);
    elements['defend-button'].click();
    assert.match(elements['party-turn-list'].children[0].textContent, /execute Archer/);
    const healthBeforeExecution = party[1].health;
    elements['defend-button'].click();
    assert.equal(party[1].health, healthBeforeExecution - Math.floor(healthBeforeExecution * 0.8));
    assert.match(elements['game-log'].children.map(function (line) {
      return line.textContent;
    }).join(' '), /defended/);
    boss.executionTarget = party[0];
    party[0].health = 1;
    attack(0);
    elements['defend-button'].click();
    assert.equal(party[0].health, 0);
    boss.attackChance = 0;
    elements['defend-button'].click();
    assert.match(elements['game-log'].children.map(function (line) {
      return line.textContent;
    }).join(' '), /Archer takes a defensive stance/);
    party[0].health = 10;
    Math.random = function () { return 0.5; };

    // Leave only two artifact types eligible and win without a level-up.
    const remaining = gameData.artifacts.slice(-2);
    party.forEach(function (member) {
      gameData.artifacts.slice(0, -2).forEach(function (artifact) {
        if (!member.hasArtifact(artifact.id)) member.equipArtifact(artifact.id);
      });
      member.attackPower = 1000;
    });
    party[0].equipArtifact(remaining[0].id);
    gameData.progression.firstLevelXp = 100000;
    boss.health = 1;
    while (!elements['combat-actions'].hidden) {
      attack(0);
      attack(0);
    }
    assert.equal(elements['level-up'].hidden, true);
    assert.equal(elements['artifact-chest'].hidden, false);
    assert.deepEqual(elements['artifact-chest'].children.slice(1).map(function (button) {
      return button.textContent;
    }).sort(), remaining.map(function (artifact) { return artifact.name; }).sort());
    elements['artifact-chest'].children.find(function (button) {
      return button.textContent === remaining[0].name;
    }).click();
    assert.equal(elements['artifact-chest'].children[1].disabled, true);
    assert.equal(elements['artifact-chest'].children[2].disabled, false);
    elements['artifact-chest'].children[2].click();
    assert.equal(elements.preparation.hidden, false);

    party.forEach(function (member) {
      gameData.artifacts.forEach(function (artifact) {
        if (!member.hasArtifact(artifact.id)) member.equipArtifact(artifact.id);
      });
    });
    elements['next-combat-button'].click();
    assert.equal(boss.name, 'The Precursor');
    boss.health = 1;
    while (!elements['combat-actions'].hidden) {
      attack(0);
      attack(0);
    }
    assert.equal(elements['artifact-chest'].hidden, false);
    assert.match(elements['artifact-chest'].children[1].textContent, /already has every artifact/);
    elements['artifact-chest'].lastElementChild.click();
    assert.equal(elements.preparation.hidden, false);
  } finally {
    Math.random = oldRandom;
    RPG.createBoss = createBoss;
    RPG.Player = OriginalPlayer;
    gameData.progression.firstLevelXp = firstLevelXp;
    delete global.document;
  }
});
