document.addEventListener('DOMContentLoaded', function () {
  const gameData = window.GAME_DATA;
  const RPG = window.RPG;
  const elements = {
    gameLog: document.getElementById('game-log'),
    gameStatus: document.getElementById('game-status'),
    start: document.getElementById('start-game'),
    classSelection: document.getElementById('class-selection'),
    combat: document.getElementById('combat-actions'),
    skills: document.getElementById('skill-list'),
    items: document.getElementById('combat-item-list'),
    combatStats: document.getElementById('combat-stats'),
    levelUp: document.getElementById('level-up'),
    shop: document.getElementById('shop'),
    preparation: document.getElementById('preparation'),
    preparationPanel: document.getElementById('preparation-panel'),
  };

  let player;
  let enemy;
  let items;
  let defeatedEnemies = 0;
  let gameOver = false;

  elements.start.addEventListener('click', showClassSelection);
  document.getElementById('attack-button').addEventListener('click', function () {
    takePlayerAction(function () {
      const result = player.attackWithResult(enemy, 0, player.damageBuff);
      player.damageBuff = 0;
      return `${player.name} attacks ${enemy.name} for ${result.damage} damage`
        + RPG.formatEffectiveness(result.effectiveness) + '.';
    });
  });
  document.getElementById('defend-button').addEventListener('click', function () {
    takePlayerAction(function () {
      player.damageBuff = 0;
      player.defend();
      return `${player.name} takes a defensive stance.`;
    });
  });
  document.getElementById('skill-button').addEventListener('click', toggleSkillList);
  document.getElementById('item-button').addEventListener('click', toggleItemList);
  document.getElementById('combat-stats-button').addEventListener('click', toggleCombatStats);
  document.getElementById('inventory-button').addEventListener('click', function () {
    renderPreparationPanel('inventory');
  });
  document.getElementById('stats-button').addEventListener('click', function () {
    renderPreparationPanel('stats');
  });
  document.getElementById('next-combat-button').addEventListener('click', startNextCombat);

  function showClassSelection() {
    elements.start.hidden = true;
    elements.classSelection.hidden = false;
    elements.classSelection.replaceChildren();
    renderOutput(['Choose your class to begin.']);
    gameData.classes.forEach(function (classData) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = classData.name;
      const description = document.createElement('small');
      description.textContent = classData.description;
      button.appendChild(description);
      button.addEventListener('click', function () {
        startGame(classData);
      });
      elements.classSelection.appendChild(button);
    });
  }

  function startGame(classData) {
    player = new RPG.Player(classData);
    classData.skills.forEach(function (definition) {
      player.addSkill(new RPG.Skill(definition));
    });
    items = gameData.items.map(function (definition) {
      return new RPG.Item(definition);
    });
    defeatedEnemies = 0;
    gameOver = false;
    elements.classSelection.hidden = true;
    elements.combat.hidden = false;
    startNextCombat();
    renderOutput([
      `${player.className} enters the fight!`,
      `A ${enemy.name} appears!`,
      '',
      'Choose an action to begin the fight.',
    ]);
  }

  function createEnemy() {
    player.resetCombatBuffs();
    const level = defeatedEnemies;
    const encounter = gameData.encounter;
    const health = encounter.baseHealth + level * encounter.healthPerDefeat
      + RPG.getRandomInt(encounter.healthRandomness);
    const attack = encounter.baseAttack + level * encounter.attackPerDefeat
      + RPG.getRandomInt(encounter.attackRandomness);
    const defense = encounter.baseDefense + Math.floor(level * encounter.defensePerDefeat)
      + RPG.getRandomInt(encounter.defenseRandomness);
    const attackChance = Math.min(encounter.maxAttackChance, encounter.baseAttackChance
      + level * encounter.attackChancePerDefeat
      + Math.random() * encounter.attackChanceRandomness);
    const damageTypes = Object.keys(gameData.damageTypes);
    const weakness = damageTypes[RPG.getRandomInt(damageTypes.length)];
    const elementalTypes = damageTypes.filter(function (damageType) {
      return damageType !== 'normal' && damageType !== weakness;
    });
    const resistance = Math.random() < 0.5
      ? elementalTypes[RPG.getRandomInt(elementalTypes.length)]
      : null;
    enemy = new RPG.Enemy(
      `Enemy ${level + 1}`,
      health,
      attack,
      defense,
      attackChance,
      [weakness],
      resistance,
    );
  }

  function startNextCombat() {
    elements.preparation.hidden = true;
    elements.combat.hidden = false;
    createEnemy();
    renderOutput([`A ${enemy.name} appears!`, 'Choose an action.']);
  }

  function toggleSkillList() {
    if (gameOver) return;
    elements.skills.hidden = !elements.skills.hidden;
    elements.items.hidden = true;
    elements.combatStats.hidden = true;
    if (!elements.skills.hidden) renderSkillList();
  }

  function toggleItemList() {
    if (gameOver) return;
    elements.items.hidden = !elements.items.hidden;
    elements.skills.hidden = true;
    elements.combatStats.hidden = true;
    if (!elements.items.hidden) renderItemList(elements.items, true);
  }

  function toggleCombatStats() {
    if (gameOver) return;
    elements.combatStats.hidden = !elements.combatStats.hidden;
    elements.skills.hidden = true;
    elements.items.hidden = true;
    if (!elements.combatStats.hidden) {
      elements.combatStats.textContent = formatPlayerStats();
    }
  }

  function renderSkillList() {
    elements.skills.replaceChildren();
    player.skills.forEach(function (skill) {
      const button = document.createElement('button');
      button.type = 'button';
      button.disabled = !player.canUseSkill(skill);
      button.textContent = `${skill.name} (${skill.mpCost} MP)`;
      const description = document.createElement('small');
      description.textContent = skill.getDescription(player, enemy);
      button.appendChild(description);
      button.addEventListener('click', function () {
        takePlayerAction(function () {
          return player.useSkill(skill, enemy);
        });
      });
      elements.skills.appendChild(button);
    });
  }

  function renderItemList(container, consumesTurn) {
    container.replaceChildren();
    items.forEach(function (item) {
      if (!player.hasItem(item.id)) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${item.name} (${player.inventory[item.id]})`;
      const description = document.createElement('small');
      description.textContent = item.description;
      button.appendChild(description);
      button.addEventListener('click', function () {
        if (!player.useItem(item)) return;
        container.hidden = true;
        const message = item.effect.type === 'scan'
          ? RPG.describeEnemy(enemy)
          : `${player.name} uses a ${item.name}.`;
        if (consumesTurn) {
          takePlayerAction(function () { return message; });
        } else {
          renderPreparationPanel('inventory');
          renderOutput([message]);
        }
      });
      container.appendChild(button);
    });
    if (!container.children.length) {
      const empty = document.createElement('p');
      empty.textContent = 'No items available.';
      container.appendChild(empty);
    }
  }

  function takePlayerAction(action) {
    if (gameOver) return;
    elements.skills.hidden = true;
    elements.items.hidden = true;
    elements.combatStats.hidden = true;
    const messages = [];
    if (player.incapacitatedTurns > 0) {
      player.incapacitatedTurns -= 1;
      messages.push(`${player.name} is incapable and loses this turn.`);
    } else {
      messages.push(action());
    }
    if (!enemy.isAlive()) {
      handleEnemyDefeat(messages);
      return;
    }
    const enemyTurn = enemy.takeTurn(player);
    messages.push(...enemyTurn.messages);
    if (!enemy.isAlive()) {
      handleEnemyDefeat(messages);
      return;
    }
    if (!player.isAlive()) {
      finishGame(messages);
      return;
    }
    player.endTurn();
    renderOutput(messages);
  }

  function handleEnemyDefeat(messages) {
    const encounter = gameData.encounter;
    defeatedEnemies += 1;
    const gold = encounter.goldMin + RPG.getRandomInt(encounter.goldMax - encounter.goldMin + 1);
    player.gold += gold;
    player.xp += encounter.xp;
    player.recoverMp(encounter.mpReward);
    messages.push(`${enemy.name} is defeated! Score: ${defeatedEnemies}.`);
    messages.push(`You gained ${encounter.xp} XP and ${gold} gold.`);
    elements.combat.hidden = true;
    player.pendingLevelUps = 0;
    while (player.xp >= player.xpNeeded()) {
      player.xp -= player.xpNeeded();
      player.pendingLevelUps += 1;
    }
    if (player.pendingLevelUps > 0) showLevelUp(messages);
    else showShop(messages);
  }

  function showLevelUp(messages) {
    elements.levelUp.hidden = false;
    elements.levelUp.replaceChildren();
    player.applyLevelGrowth();
    messages.push('', `Level ${player.level}! All stats increased. Choose a skill to learn.`);
    renderOutput(messages);
    const learned = player.skills.map(function (skill) { return skill.name; });
    const available = RPG.shuffle(gameData.levelUpSkills.filter(function (definition) {
      return !learned.includes(definition.name);
    })).slice(0, 4);
    available.forEach(function (definition) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = definition.name;
      const description = document.createElement('small');
      description.textContent = `${definition.description} (${definition.mpCost} MP)`;
      button.appendChild(description);
      button.addEventListener('click', function () {
        player.addSkill(new RPG.Skill(definition));
        player.pendingLevelUps -= 1;
        if (player.pendingLevelUps > 0) {
          showLevelUp([`You learned ${definition.name}.`]);
        } else {
          elements.levelUp.hidden = true;
          showShop([`You learned ${definition.name}.`]);
        }
      });
      elements.levelUp.appendChild(button);
    });
    if (!available.length) {
      player.pendingLevelUps = 0;
      elements.levelUp.hidden = true;
      showShop(['All available skills have been learned.']);
    }
  }

  function showShop(messages) {
    elements.shop.hidden = false;
    elements.shop.replaceChildren();
    messages.push('', 'Visit the shop before the next encounter.');
    renderOutput(messages);
    items.forEach(function (item) {
      const button = document.createElement('button');
      button.type = 'button';
      button.disabled = player.gold < item.price;
      button.textContent = `${item.name} - ${item.price} gold`;
      const description = document.createElement('small');
      description.textContent = item.description;
      button.appendChild(description);
      button.addEventListener('click', function () {
        if (player.gold < item.price) return;
        player.gold -= item.price;
        player.addItem(item.id);
        showShop([`Purchased ${item.name}.`]);
      });
      elements.shop.appendChild(button);
    });
    const leave = document.createElement('button');
    leave.type = 'button';
    leave.textContent = 'Leave Shop';
    leave.addEventListener('click', showPreparation);
    elements.shop.appendChild(leave);
  }

  function showPreparation() {
    elements.shop.hidden = true;
    elements.preparation.hidden = false;
    elements.preparationPanel.hidden = true;
    renderOutput(['Shop complete. Review your inventory and stats before continuing.']);
  }

  function renderPreparationPanel(view) {
    elements.preparationPanel.hidden = false;
    elements.preparationPanel.replaceChildren();
    if (view === 'inventory') {
      renderItemList(elements.preparationPanel, false);
      return;
    }
    const stats = document.createElement('p');
    stats.textContent = formatPlayerStats();
    elements.preparationPanel.appendChild(stats);
  }

  function formatPlayerStats() {
    return `Level ${player.level} ${player.className} | HP ${player.health}/${player.maxHealth} `
      + `| MP ${player.mp}/${player.maxMp} | Attack ${player.attackPower} `
      + `| Defense ${player.defense} | XP ${player.xp}/${player.xpNeeded()} `
      + `| Gold ${player.gold}`;
  }

  function formatStatus() {
    return `Score: ${defeatedEnemies} | ${formatPlayerStats()} | `
      + `${enemy.name}: ${enemy.health}/${enemy.maxHealth} HP`;
  }

  function finishGame(messages) {
    gameOver = true;
    messages.push('', `Defeat. You defeated ${defeatedEnemies} `
      + `${defeatedEnemies === 1 ? 'enemy' : 'enemies'}.`, '', 'Press Start Game to try again.');
    renderOutput(messages);
    elements.combat.hidden = true;
    elements.levelUp.hidden = true;
    elements.shop.hidden = true;
    elements.preparation.hidden = true;
    elements.start.hidden = false;
  }

  function renderOutput(messages) {
    elements.gameLog.replaceChildren();
    messages.forEach(function (message) {
      const line = document.createElement('p');
      line.textContent = message;
      elements.gameLog.appendChild(line);
    });
    elements.gameStatus.textContent = player ? formatStatus() : '';
  }

  renderOutput(['Welcome to the turn-based RPG.', 'Press Start Game when you are ready.']);
});
