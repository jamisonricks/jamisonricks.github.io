
document.addEventListener('DOMContentLoaded', function () {
  // Load the game's data and RPG classes from the global objects.
  const gameData = window.GAME_DATA;
  const RPG = window.RPG;

  // Cache frequently used HTML elements to avoid repeatedly searching the DOM.
  const elements = {
    gameLog: document.getElementById('game-log'),
    battlefield: document.getElementById('battlefield'),
    gameStatus: document.getElementById('game-status'),
    start: document.getElementById('start-game'),
    classSelection: document.getElementById('class-selection'),
    combat: document.getElementById('combat-actions'),
    skills: document.getElementById('skill-list'),
    items: document.getElementById('combat-item-list'),
    combatStats: document.getElementById('combat-stats'),
    targetList: document.getElementById('target-list'),
    partyTurnList: document.getElementById('party-turn-list'),
    levelUp: document.getElementById('level-up'),
    shop: document.getElementById('shop'),
    preparation: document.getElementById('preparation'),
    preparationPanel: document.getElementById('preparation-panel'),
    preparationButtons: [
      document.getElementById('inventory-button'),
      document.getElementById('skills-button'),
      document.getElementById('stats-button')
    ],
    share: document.getElementById('share-button')
  };

  // Core game state variables.
  let player;
  let party = [];
  let enemies = [];
  let selectedClasses = [];
  let pendingActions = [];
  let selectingPartyIndex = 0;
  let levelUpQueue = [];
  let items;
  let defeatedEnemies = 0;
  let additionalXpBonusPercent = 0;
  let gameOver = false;
  let inCombat = false;

  // --------------------------------------------------
  // EVENT LISTENERS
  // Connect buttons in the HTML to their game functions.
  // --------------------------------------------------

  elements.start.addEventListener('click', showClassSelection);

  document.getElementById('attack-button').addEventListener('click', function () {
    chooseAction('attack');
  });

  // Player defend button.
  document.getElementById('defend-button').addEventListener('click', function () {
    chooseAction('defend');
  });

  // Open and close the combat skill list.
  document.getElementById('skill-button').addEventListener('click', toggleSkillList);

  // Open and close the combat item list.
  document.getElementById('item-button').addEventListener('click', toggleItemList);

  // Open and close combat statistics.
  document.getElementById('combat-stats-button').addEventListener('click', toggleCombatStats);

  // Display the player's inventory during preparation.
  document.getElementById('inventory-button').addEventListener('click', function () {
    renderPreparationPanel('inventory');
  });

  // Display the player's statistics during preparation.
  document.getElementById('stats-button').addEventListener('click', function () {
    renderPreparationPanel('stats');
  });
  document.getElementById('skills-button').addEventListener('click', function () {
    renderPreparationPanel('skills');
  });
  document.getElementById('shop-button').addEventListener('click', function () {
    showShop(['Welcome back to the shop.']);
  });

  // Begin the next enemy encounter.
  document.getElementById('next-combat-button').addEventListener('click', startNextCombat);
  elements.share.addEventListener('click', shareResults);


  // --------------------------------------------------
  // GAME INITIALIZATION
  // Handles class selection and starting a new game.
  // --------------------------------------------------

  // Display the available player classes.
  function showClassSelection() {
    elements.start.hidden = true;
    elements.share.hidden = true;
    elements.classSelection.hidden = false;

    // Clear any previously generated class buttons.
    elements.classSelection.replaceChildren();

    renderOutput(['Select 2 starting party members to begin.']);

    selectedClasses = [];
    gameData.classes.forEach(function (classData) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = classData.name;

      // Display the class description underneath its name.
      const description = document.createElement('small');
      const startingItem = gameData.items.find(function (item) {
        return item.id === classData.startingItems[0];
      });
      description.textContent = `${classData.description} Passive: ${classData.passive} `
        + `Starting item: ${startingItem.name}.`;
      button.appendChild(description);

      button.addEventListener('click', function () {
        const selectedIndex = selectedClasses.indexOf(classData);
        if (selectedIndex >= 0) {
          selectedClasses.splice(selectedIndex, 1);
          button.classList.remove('selected-class');
        } else if (selectedClasses.length < 2) {
          selectedClasses.push(classData);
          button.classList.add('selected-class');
        }
        beginButton.disabled = selectedClasses.length !== 2;
      });

      elements.classSelection.appendChild(button);
    });
    const beginButton = document.createElement('button');
    beginButton.type = 'button';
    beginButton.textContent = 'Begin with Selected Party';
    beginButton.disabled = true;
    beginButton.addEventListener('click', function () {
      startGame(selectedClasses);
    });
    elements.classSelection.appendChild(beginButton);
  }

  function createPlayer(classData) {
    const newPlayer = new RPG.Player(classData);
    classData.skills.forEach(function (definition) {
      newPlayer.addSkill(new RPG.Skill(definition));
    });
    return newPlayer;
  }

  function startGame(classDataList) {
    party = classDataList.map(createPlayer);
    player = party[0];
    items = gameData.items.map(function (definition) {
      return new RPG.Item(definition);
    });
    party.forEach(function (member, index) {
      classDataList[index].startingItems.forEach(function (itemId) {
        player.addItem(itemId);
      });
    });

    // Reset the game progress.
    defeatedEnemies = 0;
    additionalXpBonusPercent = 0;
    gameOver = false;
    elements.share.hidden = true;

    // Show the combat interface and hide class selection.
    elements.classSelection.hidden = true;
    elements.combat.hidden = false;

    // Create the first enemy without rendering an intermediate message.
    createEnemy();
    inCombat = true;
    pendingActions = [];
    selectingPartyIndex = 0;
    renderPartyTurnList();

    // Display the opening game messages once.
    renderOutput([
      `${party.map(function (member) { return member.className; }).join(' and ')} enter the fight!`,
      `${enemies.length} enem${enemies.length === 1 ? 'y' : 'ies'} appear!`,
      '',
      'Choose an action to begin the fight.'
    ]);
  }


  // --------------------------------------------------
  // ENEMY GENERATION
  // Creates enemies that become stronger as the player
  // defeats more opponents.
  // --------------------------------------------------

  function createEnemy() {
    party.forEach(function (member) {
      member.resetCombatBuffs();
    });

    const level = defeatedEnemies;
    const encounter = gameData.encounter;

    // Calculate enemy health based on progression and randomness.
    // Increase enemy attack chance as the game progresses.
    const attackChance = Math.min(
      encounter.maxAttackChance,
      encounter.baseAttackChance
        + level * encounter.attackChancePerDefeat
        + Math.random() * encounter.attackChanceRandomness
    );
    // Get all available damage types.
    const damageTypes = Object.keys(gameData.damageTypes);

    const enemyCount = level === 0 ? 1 : RPG.getRandomInt(5) + 1;
    enemies = [];
    for (let index = 0; index < enemyCount; index += 1) {
      const health = Math.max(1, Math.floor((
        encounter.baseHealth + level * encounter.healthPerDefeat
        + RPG.getRandomInt(encounter.healthRandomness)) / enemyCount));
      const attack = Math.max(1, Math.floor((
        encounter.baseAttack + level * encounter.attackPerDefeat
        + RPG.getRandomInt(encounter.attackRandomness)) / Math.sqrt(enemyCount)));
      const defense = encounter.baseDefense
        + Math.floor(level * encounter.defensePerDefeat)
        + RPG.getRandomInt(encounter.defenseRandomness);
      const dexterity = encounter.baseDexterity + RPG.getRandomInt(encounter.dexterityRandomness);
      const agility = encounter.baseAgility + RPG.getRandomInt(encounter.agilityRandomness);
      const critChance = encounter.baseCritChance
        + Math.random() * encounter.critChanceRandomness;
      const speed = encounter.baseSpeed + RPG.getRandomInt(encounter.speedRandomness);
      const weakness = damageTypes[RPG.getRandomInt(damageTypes.length)];
      const elementalTypes = damageTypes.filter(function (damageType) {
        return damageType !== 'normal' && damageType !== weakness;
      });
      const resistance = Math.random() < 0.5
        ? elementalTypes[RPG.getRandomInt(elementalTypes.length)] : null;
      enemies.push(new RPG.Enemy(
        `Enemy ${level + 1}-${index + 1}`, health, attack, defense, attackChance,
        [weakness], resistance, dexterity, agility, critChance, speed
      ));
    }
  }

  // Start the next encounter after preparation is complete.
  function startNextCombat() {
    elements.preparation.hidden = true;
    elements.combat.hidden = false;

    createEnemy();
    inCombat = true;

    renderOutput([
      `${enemies.length} enem${enemies.length === 1 ? 'y' : 'ies'} appear!`,
      'Choose an action.'
    ]);
    pendingActions = [];
    selectingPartyIndex = 0;
    renderPartyTurnList();
  }


  // --------------------------------------------------
  // COMBAT INTERFACE
  // Controls the visibility of skills, items and stats.
  // --------------------------------------------------

  // Show or hide the available combat skills.
  function toggleSkillList() {
    if (gameOver) return;

    elements.skills.hidden = !elements.skills.hidden;

    // Close other combat panels.
    elements.items.hidden = true;
    elements.combatStats.hidden = true;

    if (!elements.skills.hidden) {
      renderSkillList();
    }
  }

  // Show or hide the available combat items.
  function toggleItemList() {
    if (gameOver) return;

    elements.items.hidden = !elements.items.hidden;

    // Close other combat panels.
    elements.skills.hidden = true;
    elements.combatStats.hidden = true;

    if (!elements.items.hidden) {
      renderItemList(elements.items, true);
    }
  }

  // Show or hide the player's combat statistics.
  function toggleCombatStats() {
    if (gameOver) return;

    elements.combatStats.hidden = !elements.combatStats.hidden;

    // Close other combat panels.
    elements.skills.hidden = true;
    elements.items.hidden = true;

    if (!elements.combatStats.hidden) {
      renderCombatStats();
    }
  }

  function renderCombatStats() {
    elements.combatStats.textContent = formatPlayerStats(
      inCombat ? party[selectingPartyIndex] : null
    );
  }


  // --------------------------------------------------
  // SKILL MANAGEMENT
  // Generates buttons for the player's available skills.
  // --------------------------------------------------

  function renderSkillList() {
    // Remove any previously generated skill buttons.
    elements.skills.replaceChildren();

    party[selectingPartyIndex].skills.forEach(function (skill) {
      const button = document.createElement('button');
      button.type = 'button';
      button.classList.add(`skill-rarity-${skill.rarity}`);

      // Disable skills the player cannot currently afford or use.
      button.disabled = !party[selectingPartyIndex].canUseSkill(skill);

      button.textContent = `${skill.name} (${party[selectingPartyIndex].getSkillCost(skill)} MP)`;

      // Display a description of what the skill does.
      const description = document.createElement('small');
      description.textContent = skill.getDescription(party[selectingPartyIndex], enemies[0]);
      button.appendChild(description);

      // Use the selected skill and process the combat turn.
      button.addEventListener('click', function () {
        chooseAction('skill', skill);
      });

      elements.skills.appendChild(button);
    });
  }


  // --------------------------------------------------
  // ITEM MANAGEMENT
  // Displays available items and handles their effects.
  // --------------------------------------------------

  function renderItemList(container, consumesTurn) {
    // Clear the current item list before rebuilding it.
    container.replaceChildren();

    items.forEach(function (item) {
      // Only display items that exist in the player's inventory.
      if (!player.hasItem(item.id)) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.disabled = !consumesTurn && item.effect.type === 'scan';

      // Show the item name and quantity.
      button.textContent = `${item.name} (${player.inventory[item.id]})`;

      // Display the item's description.
      const description = document.createElement('small');
      description.textContent = item.description;
      button.appendChild(description);

      // Handle the item being selected.
      button.addEventListener('click', function () {
        container.hidden = true;
        if (consumesTurn) {
          chooseAction('item', item);
        } else {
          renderPreparationItemTargets(item);
        }
      });

      container.appendChild(button);
    });

    // Display a message if the player has no available items.
    if (!container.children.length) {
      const empty = document.createElement('p');
      empty.textContent = 'No items available.';
      container.appendChild(empty);
    }

    function renderPreparationItemTargets(item) {
      elements.preparationPanel.hidden = false;
      elements.preparationPanel.replaceChildren();
      const prompt = document.createElement('p');
      prompt.textContent = `Select an ally to use ${item.name} on.`;
      elements.preparationPanel.appendChild(prompt);
      party.forEach(function (member) {
        const button = document.createElement('button');
        button.type = 'button';
        button.disabled = item.effect.type === 'revive' ? member.isAlive() : !member.isAlive();
        button.textContent = `${member.name} (${member.health}/${member.maxHealth} HP)`;
        button.addEventListener('click', function () {
          if (!player.useItem(item, member)) return;
          renderPreparationPanel('inventory');
          renderOutput([`${player.name} uses a ${item.name} on ${member.name}.`]);
        });
        elements.preparationPanel.appendChild(button);
      });
      const back = document.createElement('button');
      back.type = 'button';
      back.textContent = 'Back to Inventory';
      back.addEventListener('click', function () {
        renderPreparationPanel('inventory');
      });
      elements.preparationPanel.appendChild(back);
    }
  }


  // --------------------------------------------------
  // TURN PROCESSING
  // Handles the player's action, enemy response and
  // checks whether either combatant has been defeated.
  // --------------------------------------------------

  function chooseAction(type, payload) {
    const actor = party[selectingPartyIndex];
    if (type === 'defend') {
      pendingActions[selectingPartyIndex] = { actor, type, target: actor };
      advanceActionSelection();
      return;
    }
    elements.skills.hidden = true;
    elements.items.hidden = true;
    const targetType = payload && payload.targetType || 'enemy';
    if (targetType === 'self' || targetType === 'allEnemies' || targetType === 'allAllies') {
      const targets = targetType === 'self'
        ? [actor]
        : targetType === 'allAllies'
          ? party.filter(function (member) { return member.isAlive(); })
          : enemies.filter(function (enemy) { return enemy.isAlive(); });
      selectTarget({ type, payload }, targets);
      return;
    }
    elements.targetList.hidden = false;
    renderTargets(type, payload);
  }

  function renderTargets(type, payload) {
    elements.targetList.replaceChildren();
    const actor = party[selectingPartyIndex];
    const effect = payload && payload.effect;
    const allies = party.filter(function (member) { return member.isAlive(); });
    const fallenAllies = party.filter(function (member) { return !member.isAlive(); });
    const targetType = payload && payload.targetType || 'enemy';
    const targets = effect && effect.type === 'revive' ? fallenAllies
      : targetType === 'enemy'
      ? enemies.filter(function (target) { return target.isAlive(); })
      : targetType === 'ally' ? allies
        : targetType === 'self' ? [actor]
          : targetType === 'allEnemies'
            ? enemies.filter(function (target) { return target.isAlive(); })
            : targetType === 'allAllies' ? allies : fallenAllies;
    const allTargets = targetType === 'allEnemies'
      ? enemies.filter(function (target) { return target.isAlive(); })
      : targetType === 'allAllies' ? allies : null;
    if (allTargets) {
      addTargetButton(`${payload ? payload.name : type} (all valid targets)`, function () {
        selectTarget({ type, payload }, allTargets);
      });
      return;
    }
    targets.forEach(function (target) {
      addTargetButton(`${target.name} (${target.health}/${target.maxHealth} HP)`, function () {
        selectTarget({ type, payload }, [target]);
      });
    });
    addTargetButton('Back', function () {
      elements.targetList.hidden = true;
      if (type === 'item') {
        elements.items.hidden = false;
        renderItemList(elements.items, true);
      } else {
        renderSkillList();
      }
    });
  }

  function addTargetButton(label, callback) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', callback);
    elements.targetList.appendChild(button);
  }

  function selectTarget(action, targets) {
    const selected = action.type ? action : { type: 'skill', payload: action };
    pendingActions[selectingPartyIndex] = {
      actor: party[selectingPartyIndex],
      type: selected.type || 'skill',
      payload: selected.payload || selected,
      targets
    };
    elements.targetList.hidden = true;
    advanceActionSelection();
  }

  function advanceActionSelection() {
    const nextIndex = party.findIndex(function (member, index) {
      return member.isAlive() && !pendingActions[index];
    });
    if (nextIndex >= 0) {
      selectingPartyIndex = nextIndex;
      const passiveReady = party[nextIndex].preparePassive();
      setActivePartyMember(nextIndex);
      renderOutput([
        `${party[nextIndex].name}, choose an action.`,
        passiveReady ? '👁️ Deadeye is ready: the next attack is guaranteed to hit and critically hit.' : ''
      ]);
      return;
    }
    executePlannedTurn();
  }

  function renderPartyTurnList() {
    elements.partyTurnList.replaceChildren();
    party.forEach(function (member, index) {
      if (!member.isAlive()) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.classList.toggle('active-party-member', index === selectingPartyIndex);
      const readyIcon = member.guaranteedAttackReady ? '👁️ ' : '';
      button.textContent = `${readyIcon}${index + 1}: ${member.name}`
        + (pendingActions[index] ? ' (Ready)' : ' (Choose)');
      button.addEventListener('click', function () {
        setActivePartyMember(index);
        elements.targetList.hidden = true;
        if (!elements.skills.hidden) {
          renderSkillList();
        }
      });
      elements.partyTurnList.appendChild(button);
    });
  }

  function setActivePartyMember(index) {
    selectingPartyIndex = index;
    renderPartyTurnList();
    if (!elements.combatStats.hidden) {
      renderCombatStats();
    }
  }

  function executePlannedTurn() {
    // Prevent any further actions after the game ends.
    if (gameOver) return;

    // Close all combat panels before processing the turn.
    elements.skills.hidden = true;
    elements.items.hidden = true;
    elements.combatStats.hidden = true;

    const messages = [];

    const actors = party.concat(enemies).filter(function (combatant) {
      return combatant.isAlive();
    }).sort(function (left, right) {
      return right.speed - left.speed;
    });
    actors.forEach(function (actor) {
      if (!actor.isAlive()) return;
      if (party.includes(actor)) {
        const index = party.indexOf(actor);
        const action = pendingActions[index];
        if (!action) return;
        if (actor.preparePassive()) {
          messages.push('Deadeye is ready: the next attack is guaranteed to hit and critically hit.');
        }
        messages.push(executeAction(action));
      } else {
        const target = party.filter(function (member) { return member.isAlive(); })
          [RPG.getRandomInt(Math.max(1, party.filter(function (member) {
            return member.isAlive();
          }).length))];
        if (target) messages.push(...actor.takeTurn(target).messages);
      }
    });
    pendingActions = [];
    if (!enemies.some(function (target) { return target.isAlive(); })) {
      handleEnemyDefeat(messages);
      return;
    }
    if (!party.some(function (member) { return member.isAlive(); })) {
      finishGame(messages);
      return;
    }
    party.forEach(function (member) {
      if (member.isAlive()) member.endTurn();
    });

    // Display all messages generated during the turn.
    renderOutput(messages);
    selectingPartyIndex = 0;
    renderPartyTurnList();
  }

  function executeAction(action) {
    const actor = action.actor;
    if (actor.incapacitatedTurns > 0) {
      actor.incapacitatedTurns -= 1;
      return `${actor.name} is incapable and loses this turn.`;
    }
    if (action.type === 'defend') {
      actor.damageBuff = 0;
      actor.defend();
      return `${actor.name} takes a defensive stance.`;
    }
    if (action.type === 'attack') {
      const target = action.targets[0];
      const result = actor.attackWithResult(target, 0, actor.damageBuff, 'normal',
        actor.consumeGuaranteedAttack());
      actor.damageBuff = 0;
      if (actor.passiveType === 'Mage') actor.recoverMp(2);
      return RPG.formatAttackResult(actor, target, result);
    }
    if (action.type === 'item') {
      const item = action.payload;
      const result = player.useItem(item, action.targets[0]);
      return result.message;
    }
    return actor.useSkill(action.payload, action.targets);
  }


  // --------------------------------------------------
  // ENEMY DEFEAT AND REWARDS
  // Handles rewards, XP and progression after combat.
  // --------------------------------------------------

  function handleEnemyDefeat(messages) {
    const encounter = gameData.encounter;

    // Increase the player's defeat counter.
    defeatedEnemies += 1;

    // Generate a random gold reward.
    const gold = encounter.goldMin
      + RPG.getRandomInt(encounter.goldMax - encounter.goldMin + 1);

    // Award the player their rewards.
    player.gold += gold;
    const enemyCountBonusPercent = Math.max(0, enemies.length - 1) * 20;
    const xpBonusPercent = enemyCountBonusPercent + additionalXpBonusPercent;
    const xpReward = Math.floor(encounter.xp * (1 + xpBonusPercent / 100));
    party.forEach(function (member) {
      const wasDefeated = !member.isAlive();
      if (wasDefeated) member.health = 1;
      const memberXp = wasDefeated ? Math.floor(xpReward / 2) : xpReward;
      member.xp += memberXp;
      member.totalXp += memberXp;
      member.recoverMp(encounter.mpReward);
      if (wasDefeated) {
        messages.push(`${member.name} revives with 1 HP and receives half XP.`);
      }
    });

    // Add reward information to the combat log.
    messages.push(`${enemies.length} enemies are defeated! Score: ${defeatedEnemies}.`);
    messages.push(`You gained ${xpReward} XP (+${xpBonusPercent}%) total and ${gold} gold.`);

    // Hide the combat interface while the player progresses.
    elements.combat.hidden = true;
    inCombat = false;

    // Check which party members earned level-ups.
    levelUpQueue = [];
    party.forEach(function (member) {
      member.pendingLevelUps = 0;
      while (member.xp >= member.xpNeeded()) {
        member.xp -= member.xpNeeded();
        member.applyLevelGrowth();
        member.pendingLevelUps += 1;
      }
      if (member.pendingLevelUps > 0) levelUpQueue.push(member);
    });

    // Show the level-up screen if necessary, then return to preparation.
    if (levelUpQueue.length) {
      showLevelUp(messages);
    } else {
      showPreparation(messages);
    }
  }


  // --------------------------------------------------
  // LEVEL-UP SYSTEM
  // Increases player stats and allows new skills to be learned.
  // --------------------------------------------------

  function showLevelUp(messages) {
    const levelingMember = levelUpQueue[0];
    elements.levelUp.hidden = false;
    elements.levelUp.replaceChildren();

    messages.push(
      '',
      `${levelingMember.name} reached level ${levelingMember.level}! Choose a skill.`
    );

    renderOutput(messages);

    // Get the names of skills the player already knows.
    const learned = levelingMember.skills.map(function (skill) {
      return skill.name;
    });

    // Find skills that have not already been learned.
    // Shuffle the available skills and offer up to four choices.
    const available = chooseLevelUpSkills(gameData.levelUpSkills.filter(function (definition) {
      return !learned.includes(definition.name);
    }), 4);

    available.forEach(function (definition) {
      const button = document.createElement('button');
      button.type = 'button';
      button.classList.add(`skill-rarity-${definition.rarity}`);
      button.textContent = definition.name;

      // Display the skill description and MP cost.
      const description = document.createElement('small');
      description.textContent = `${definition.description} (${definition.mpCost} MP) `
        + `[${definition.rarity}]`;
      button.appendChild(description);

      // Add the selected skill to the player's skill list.
      button.addEventListener('click', function () {
        levelingMember.addSkill(new RPG.Skill(definition));
        levelingMember.pendingLevelUps -= 1;

        // If more level-ups are pending, show another skill selection.
        if (levelingMember.pendingLevelUps > 0) {
          showLevelUp([`You learned ${definition.name}.`]);
        } else {
          levelUpQueue.shift();
          // Otherwise, finish levelling and return to preparation.
          if (levelUpQueue.length) {
            showLevelUp([`${levelingMember.name} learned ${definition.name}.`]);
          } else {
            elements.levelUp.hidden = true;
            showPreparation([`${levelingMember.name} learned ${definition.name}.`]);
          }
        }
      });

      elements.levelUp.appendChild(button);
    });

    // Handle the situation where all available skills are already learned.
    if (!available.length) {
      levelingMember.pendingLevelUps = 0;
      levelUpQueue.shift();
      if (levelUpQueue.length) {
        showLevelUp([`${levelingMember.name} has no new skills to learn.`]);
      } else {
        elements.levelUp.hidden = true;
        showPreparation(['All available skills have been learned.']);
      }
    }
  }


  // --------------------------------------------------
  // SHOP SYSTEM
  // Allows the player to spend gold on items before
  // entering the next encounter.
  // --------------------------------------------------

  function showShop(messages) {
    elements.shop.hidden = false;
    elements.preparation.hidden = true;
    inCombat = false;
    elements.shop.replaceChildren();

    messages.push('', 'Spend gold in the shop, then return to preparation when ready.');

    renderOutput(messages);

    const tabs = document.createElement('div');
    const content = document.createElement('div');
    const tabNames = [
      ['gear', 'Upgrade Gear'],
      ['consumables', 'Consumables'],
      ['skills', 'Learn Skill'],
      ['recruit', 'Recruit'],
    ];

    tabNames.forEach(function (tab) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.shopTab = tab[0];
      button.addEventListener('click', function () {
        tabs.querySelectorAll('button').forEach(function (tabButton) {
          tabButton.classList.remove('selected-shop-tab');
        });
        button.classList.add('selected-shop-tab');
        renderShopTab(tab[0], content);
      });
      button.textContent = tab[1];
      tabs.appendChild(button);
    });
    elements.shop.appendChild(tabs);
    elements.shop.appendChild(content);
    tabs.querySelector('[data-shop-tab="gear"]').classList.add('selected-shop-tab');
    renderShopTab('gear', content);

    // Add a button to leave the shop and enter preparation.
    const leave = document.createElement('button');
    leave.type = 'button';
    leave.textContent = 'Leave Shop';

    leave.addEventListener('click', showPreparation);

    elements.shop.appendChild(leave);
  }

  function chooseLevelUpSkills(pool, count) {
    const weights = { common: 75, rare: 20, legendary: 5 };
    const choices = [];
    const remaining = pool.slice();
    while (choices.length < count && remaining.length) {
      const totalWeight = remaining.reduce(function (total, definition) {
        return total + weights[definition.rarity];
      }, 0);
      let roll = Math.random() * totalWeight;
      let selectedIndex = 0;
      for (let index = 0; index < remaining.length; index += 1) {
        roll -= weights[remaining[index].rarity];
        if (roll < 0) {
          selectedIndex = index;
          break;
        }
      }
      choices.push(remaining.splice(selectedIndex, 1)[0]);
    }
    return choices;
  }

  function getUpgradeCost(type, member) {
    const owner = member || player;
    const upgrade = type === 'weapon'
      ? gameData.shop.weaponUpgrade : gameData.shop.armorUpgrade;
    const level = type === 'weapon' ? owner.weaponLevel : owner.armorLevel;
    return upgrade.baseCost + level * upgrade.costIncrease;
  }

  function renderShopTab(tabName, content) {
    content.replaceChildren();
    if (tabName === 'gear') {
      renderGearShop(content);
    } else if (tabName === 'consumables') {
      renderConsumableShop(content);
    } else if (tabName === 'recruit') {
      renderRecruitShop(content);
    } else {
      renderSkillShop(content);
    }
  }

  function addShopPurchaseButton(container, label, description, disabled, purchase) {
    const button = document.createElement('button');
    button.type = 'button';
    button.disabled = disabled;
    button.textContent = label;
    const detail = document.createElement('small');
    detail.textContent = description;
    button.appendChild(detail);
    button.addEventListener('click', purchase);
    container.appendChild(button);
  }

  function renderGearShop(container) {
    const weapon = gameData.shop.weaponUpgrade;
    const armor = gameData.shop.armorUpgrade;
    party.forEach(function (member) {
      const heading = document.createElement('h3');
      heading.textContent = member.name;
      container.appendChild(heading);
      const weaponCost = getUpgradeCost('weapon', member);
      const armorCost = getUpgradeCost('armor', member);
      addShopPurchaseButton(
        container,
        `Upgrade Weapon - ${weaponCost} gold`,
        `Level ${member.weaponLevel} -> ${member.weaponLevel + 1}; `
          + `Attack +${weapon.attackIncrease} (${member.attackPower} -> `
          + `${member.attackPower + weapon.attackIncrease}).`,
        player.gold < weaponCost,
        function () {
          if (player.gold < weaponCost) return;
          player.gold -= weaponCost;
          member.upgradeWeapon(weapon.attackIncrease);
          showShop([`${member.name}'s weapon upgraded to level ${member.weaponLevel}.`]);
        }
      );
      addShopPurchaseButton(
        container,
        `Upgrade Armor - ${armorCost} gold`,
        `Level ${member.armorLevel} -> ${member.armorLevel + 1}; `
          + `Defense +${armor.defenseIncrease} (${member.defense} -> `
          + `${member.defense + armor.defenseIncrease}).`,
        player.gold < armorCost,
        function () {
          if (player.gold < armorCost) return;
          player.gold -= armorCost;
          member.upgradeArmor(armor.defenseIncrease);
          showShop([`${member.name}'s armor upgraded to level ${member.armorLevel}.`]);
        }
      );
    });
  }

  function renderConsumableShop(container) {
    items.forEach(function (item) {
      addShopPurchaseButton(
        container,
        `${item.name} - ${item.price} gold`,
        item.description,
        player.gold < item.price,
        function () {
          if (player.gold < item.price) return;
          player.gold -= item.price;
          player.addItem(item.id);
          showShop([`Purchased ${item.name}.`]);
        }
      );
    });
  }

  function renderSkillShop(container) {
    const prompt = document.createElement('p');
    prompt.textContent = 'Select a party member to learn a skill.';
    container.appendChild(prompt);
    party.forEach(function (member) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = member.name;
      button.addEventListener('click', function () {
        renderMemberSkillShop(container, member);
      });
      container.appendChild(button);
    });
  }

  function renderMemberSkillShop(container, member) {
    container.replaceChildren();
    const heading = document.createElement('h3');
    heading.textContent = `${member.name}: choose a skill`;
    container.appendChild(heading);

    const learned = member.skills.map(function (skill) {
      return skill.name;
    });
    const available = gameData.levelUpSkills.filter(function (definition) {
      return !learned.includes(definition.name);
    });
    if (!available.length) {
      const empty = document.createElement('p');
      empty.textContent = `${member.name} has learned every available skill.`;
      container.appendChild(empty);
      addMemberSkillBackButton(container);
      return;
    }
    available.forEach(function (definition) {
      const cost = getSkillCost(definition);
      addShopPurchaseButton(
        container,
        `${definition.name} - ${cost} gold`,
        `${definition.description} (${definition.mpCost} MP) [${definition.rarity}]`,
        player.gold < cost,
        function () {
          if (player.gold < cost) return;
          player.gold -= cost;
          member.addSkill(new RPG.Skill(definition));
          showShop([`${member.name} learned ${definition.name}.`]);
        }
      );
      container.lastElementChild.classList.add(`skill-rarity-${definition.rarity}`);
    });
    addMemberSkillBackButton(container);
  }

  function addMemberSkillBackButton(container) {
    const back = document.createElement('button');
    back.type = 'button';
    back.textContent = 'Choose a Different Party Member';
    back.addEventListener('click', function () {
      renderSkillShop(container);
    });
    container.appendChild(back);
  }

  function getSkillCost(definition) {
    return { common: 25, rare: 50, legendary: 100 }[definition.rarity];
  }

  function renderRecruitShop(container) {
    gameData.classes.forEach(function (classData) {
      const alreadyRecruited = party.some(function (member) {
        return member.className === classData.name;
      });
      addShopPurchaseButton(
        container,
        `${classData.name} - 100 gold`,
        alreadyRecruited ? 'Already in your party.' : classData.description,
        alreadyRecruited || party.length >= 4 || player.gold < 100,
        function () {
          if (alreadyRecruited || party.length >= 4 || player.gold < 100) return;
          player.gold -= 100;
          const recruit = createPlayer(classData);
          classData.startingItems.forEach(function (itemId) {
            player.addItem(itemId);
          });
          party.push(recruit);
          showShop([`${classData.name} joined your party.`]);
        }
      );
      if (alreadyRecruited) {
        container.lastElementChild.classList.add('recruit-unavailable');
      }
    });
  }


  // --------------------------------------------------
  // PREPARATION SCREEN
  // Allows the player to review inventory and statistics
  // before beginning the next combat encounter.
  // --------------------------------------------------

  function showPreparation(messages) {
    if (!Array.isArray(messages)) {
      messages = null;
    }
    elements.shop.hidden = true;
    elements.preparation.hidden = false;
    elements.preparationPanel.hidden = true;
    elements.preparationButtons.forEach(function (button) {
      button.classList.remove('selected-preparation-view');
    });
    inCombat = false;

    renderOutput(messages || [
      'Review your inventory and stats, visit the shop, or start the next fight.'
    ]);
  }

  // Display either the inventory or player statistics.
  function renderPreparationPanel(view) {
    elements.preparationPanel.hidden = false;
    elements.preparationPanel.replaceChildren();
    elements.preparationButtons.forEach(function (button) {
      button.classList.toggle('selected-preparation-view', button.id === `${view}-button`);
    });

    // Show inventory items if inventory was selected.
    if (view === 'inventory') {
      renderItemList(elements.preparationPanel, false);
      return;
    }

    if (view === 'skills') {
      renderPreparationSkills();
      return;
    }

    // Outside battle, display every party member's statistics.
    party.forEach(function (member) {
      const stats = document.createElement('p');
      stats.textContent = formatPlayerStats(member);
      elements.preparationPanel.appendChild(stats);
    });
  }

  function renderPreparationSkills() {
    if (!party.some(function (member) { return member.skills.length; })) {
      const empty = document.createElement('p');
      empty.textContent = 'No skills learned.';
      elements.preparationPanel.appendChild(empty);
      return;
    }
    party.forEach(function (member) {
      const heading = document.createElement('h3');
      heading.textContent = member.name;
      elements.preparationPanel.appendChild(heading);
      member.skills.forEach(function (skill) {
        const skillEntry = document.createElement('p');
        skillEntry.classList.add(`skill-rarity-${skill.rarity}`);
        skillEntry.textContent = `${skill.name} [${skill.rarity}] - ${skill.description}`;
        elements.preparationPanel.appendChild(skillEntry);
      });
    });
  }


  // --------------------------------------------------
  // PLAYER STATISTICS
  // Formats player and enemy information for display.
  // --------------------------------------------------

  // Generate a readable summary of the player's current stats.
  function formatPlayerStats(member) {
    const subject = member || player;
    return `Level ${subject.level} ${subject.className} | HP ${subject.health}/${subject.maxHealth} `
      + `| MP ${subject.mp}/${subject.maxMp} | Attack ${subject.attackPower} `
      + `| Weapon Lv ${subject.weaponLevel} | Defense ${subject.defense} `
      + `| Armor Lv ${subject.armorLevel} | Total XP ${subject.totalXp} `
      + `| XP to next level ${subject.xp}/${subject.xpNeeded()} `
      + `| Dexterity ${subject.dexterity} | Agility ${subject.agility} `
      + `| Speed ${subject.speed} | Crit ${Math.round(subject.critChance * 100)}%`;
  }

  // Generate the complete combat status line.
  function formatStatus() {
    return `Score: ${defeatedEnemies} | Gold: ${player.gold}`;
  }


  // --------------------------------------------------
  // GAME OVER
  // Handles the player's defeat and allows a new game
  // to be started.
  // --------------------------------------------------

  function finishGame(messages) {
    gameOver = true;

    // Add the final score and restart instructions.
    messages.push(
      '',
      `Defeat. You defeated ${defeatedEnemies} `
        + `${defeatedEnemies === 1 ? 'enemy' : 'enemies'}.`,
      '',
      'Press Start Game to try again.'
    );

    renderOutput(messages);

    // Hide all game screens except the start button.
    elements.combat.hidden = true;
    elements.levelUp.hidden = true;
    elements.shop.hidden = true;
    elements.preparation.hidden = true;

    elements.start.hidden = false;
    elements.share.hidden = false;
  }

  function shareResults() {
    const text = `I reached score ${defeatedEnemies} as a level ${player.level} `
      + `${player.className} in Turn-Based RPG. Play at https://jamisonricks.github.io`;
    if (typeof navigator !== 'undefined'
      && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        renderOutput(['Your result was copied to the clipboard!', text]);
      }).catch(function () {
        copyWithLegacyFallback(text);
      });
      return;
    }
    copyWithLegacyFallback(text);
  }

  function copyWithLegacyFallback(text) {
    const copyArea = document.createElement('textarea');
    copyArea.value = text;
    copyArea.setAttribute('readonly', '');
    copyArea.style.position = 'fixed';
    copyArea.style.left = '-9999px';
    document.body.appendChild(copyArea);
    copyArea.select();

    let copied = false;
    try {
      copied = document.execCommand('copy');
    } finally {
      copyArea.remove();
    }

    if (!copied) {
      renderOutput(['Clipboard access is unavailable. Copy this text manually:', text]);
      return;
    }
    renderOutput(['Your result was copied to the clipboard!', text]);
  }


  // --------------------------------------------------
  // OUTPUT AND GAME LOG
  // Displays messages and keeps the status information
  // updated throughout the game.
  // --------------------------------------------------

  function renderOutput(messages) {
    // Clear the previous combat log.
    elements.gameLog.replaceChildren();

    // Create a paragraph for each message.
    messages.forEach(function (message) {
      const line = document.createElement('p');
      line.textContent = message;

      elements.gameLog.appendChild(line);
    });

    // Update the status bar if a player exists.
    renderStatus();
    renderBattlefield();
  }

  function renderBattlefield() {
    elements.battlefield.replaceChildren();
    elements.battlefield.hidden = !inCombat || !party.length;
    if (elements.battlefield.hidden) return;

    const enemyRow = document.createElement('div');
    enemyRow.className = 'battlefield-row battlefield-enemies';
    enemies.forEach(function (enemy) {
      const combatant = document.createElement('div');
      combatant.className = `battlefield-combatant${enemy.isAlive() ? '' : ' defeated'}`;
      combatant.title = enemy.name;
      const icon = document.createElement('span');
      icon.className = 'battlefield-icon';
      icon.textContent = 'x';
      combatant.appendChild(icon);
      combatant.appendChild(createBattleBar(enemy.health, enemy.maxHealth, 'health-bar'));
      enemyRow.appendChild(combatant);
    });
    elements.battlefield.appendChild(enemyRow);

    const partyRow = document.createElement('div');
    partyRow.className = 'battlefield-row battlefield-party';
    party.forEach(function (member) {
      const combatant = document.createElement('div');
      combatant.className = `battlefield-combatant${member.isAlive() ? '' : ' defeated'}`;
      combatant.title = member.name;
      const icon = document.createElement('span');
      icon.className = 'battlefield-icon';
      icon.textContent = member.icon;
      combatant.appendChild(icon);
      combatant.appendChild(createBattleBar(member.health, member.maxHealth, 'health-bar'));
      combatant.appendChild(createBattleBar(member.mp, member.maxMp, 'mp-bar'));
      partyRow.appendChild(combatant);
    });
    elements.battlefield.appendChild(partyRow);
  }

  function createBattleBar(value, maximum, className) {
    const bar = document.createElement('div');
    bar.className = `battlefield-bar ${className}`;
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', String(maximum));
    bar.setAttribute('aria-valuenow', String(value));
    const fill = document.createElement('div');
    fill.className = 'battlefield-bar-fill';
    fill.style.width = `${maximum ? Math.max(0, Math.min(100, value / maximum * 100)) : 0}%`;
    bar.appendChild(fill);
    return bar;
  }

  function renderStatus() {
    elements.gameStatus.replaceChildren();
    if (!player) return;
    const statusMembers = inCombat ? party : party;
    statusMembers.forEach(function (member) {
      const quadrant = document.createElement('div');
      quadrant.className = 'status-quadrant';
      quadrant.textContent = `${member.className} Lv ${member.level} `
        + `HP ${member.health}/${member.maxHealth} `
        + `MP ${member.mp}/${member.maxMp}`;
      elements.gameStatus.appendChild(quadrant);
    });
    const summary = document.createElement('div');
    summary.className = 'status-summary';
    summary.textContent = `Score: ${defeatedEnemies} | Gold: ${player.gold}`;
    elements.gameStatus.appendChild(summary);
  }


  // --------------------------------------------------
  // INITIAL DISPLAY
  // Show the welcome message when the page first loads.
  // --------------------------------------------------

  renderOutput([
    'Welcome to my turn-based rougelike game.',
    'Press Start Game when you are ready.'
  ]);

});
