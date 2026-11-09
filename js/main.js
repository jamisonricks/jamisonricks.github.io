
document.addEventListener('DOMContentLoaded', function () {
  // Load the game's data and RPG classes from the global objects.
  const gameData = window.GAME_DATA;
  const RPG = window.RPG;

  // Cache frequently used HTML elements to avoid repeatedly searching the DOM.
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
    share: document.getElementById('share-button')
  };

  // Core game state variables.
  let player;
  let enemy;
  let items;
  let defeatedEnemies = 0;
  let gameOver = false;
  let inCombat = false;

  // --------------------------------------------------
  // EVENT LISTENERS
  // Connect buttons in the HTML to their game functions.
  // --------------------------------------------------

  elements.start.addEventListener('click', showClassSelection);

  // Player attack button.
  document.getElementById('attack-button').addEventListener('click', function () {
    takePlayerAction(function () {
      const result = player.attackWithResult(enemy, 0, player.damageBuff, 'normal',
        player.consumeGuaranteedAttack());

      // Remove any temporary damage bonus after attacking.
      player.damageBuff = 0;

      if (player.passiveType === 'Mage') player.recoverMp(2);
      const message = RPG.formatAttackResult(player, enemy, result);
      return player.passiveType === 'Mage'
        ? `${message} Mage passive restores 2 MP.`
        : message;
    });
  });

  // Player defend button.
  document.getElementById('defend-button').addEventListener('click', function () {
    takePlayerAction(function () {
      // Remove any unused temporary damage bonus.
      player.damageBuff = 0;

      player.defend();

      return `${player.name} takes a defensive stance.`;
    });
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

    renderOutput(['Choose your class to begin.']);

    // Generate a selection button for each available class.
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

      // Start the game using the selected class.
      button.addEventListener('click', function () {
        startGame(classData);
      });

      elements.classSelection.appendChild(button);
    });
  }

  // Initialise the player, inventory and first enemy encounter.
  function startGame(classData) {
    // Create the player using the selected class.
    player = new RPG.Player(classData);

    // Give the player the skills associated with their class.
    classData.skills.forEach(function (definition) {
      player.addSkill(new RPG.Skill(definition));
    });

    // Create the game's item objects from the game data.
    items = gameData.items.map(function (definition) {
      return new RPG.Item(definition);
    });
    classData.startingItems.forEach(function (itemId) {
      player.addItem(itemId);
    });

    // Reset the game progress.
    defeatedEnemies = 0;
    gameOver = false;
    elements.share.hidden = true;

    // Show the combat interface and hide class selection.
    elements.classSelection.hidden = true;
    elements.combat.hidden = false;

    // Create the first enemy without rendering an intermediate message.
    createEnemy();
    inCombat = true;

    // Display the opening game messages once.
    renderOutput([
      `${player.className} enters the fight!`,
      `A ${enemy.name} appears!`,
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
    // Clear temporary combat buffs before a new encounter.
    player.resetCombatBuffs();

    const level = defeatedEnemies;
    const encounter = gameData.encounter;

    // Calculate enemy health based on progression and randomness.
    const health = encounter.baseHealth
      + level * encounter.healthPerDefeat
      + RPG.getRandomInt(encounter.healthRandomness);

    // Calculate enemy attack power.
    const attack = encounter.baseAttack
      + level * encounter.attackPerDefeat
      + RPG.getRandomInt(encounter.attackRandomness);

    // Calculate enemy defence.
    const defense = encounter.baseDefense
      + Math.floor(level * encounter.defensePerDefeat)
      + RPG.getRandomInt(encounter.defenseRandomness);

    // Increase enemy attack chance as the game progresses.
    const attackChance = Math.min(
      encounter.maxAttackChance,
      encounter.baseAttackChance
        + level * encounter.attackChancePerDefeat
        + Math.random() * encounter.attackChanceRandomness
    );
    const dexterity = encounter.baseDexterity
      + RPG.getRandomInt(encounter.dexterityRandomness);
    const agility = encounter.baseAgility
      + RPG.getRandomInt(encounter.agilityRandomness);
    const critChance = encounter.baseCritChance
      + Math.random() * encounter.critChanceRandomness;

    // Get all available damage types.
    const damageTypes = Object.keys(gameData.damageTypes);

    // Randomly assign the enemy a weakness.
    const weakness = damageTypes[RPG.getRandomInt(damageTypes.length)];

    // Find elemental types that are neither normal nor the weakness.
    const elementalTypes = damageTypes.filter(function (damageType) {
      return damageType !== 'normal' && damageType !== weakness;
    });

    // Give the enemy a 50% chance of having an elemental resistance.
    const resistance = Math.random() < 0.5
      ? elementalTypes[RPG.getRandomInt(elementalTypes.length)]
      : null;

    // Create the enemy using the calculated statistics.
    enemy = new RPG.Enemy(
      `Enemy ${level + 1}`,
      health,
      attack,
      defense,
      attackChance,
      [weakness],
      resistance,
      dexterity,
      agility,
      critChance
    );
  }

  // Start the next encounter after preparation is complete.
  function startNextCombat() {
    elements.preparation.hidden = true;
    elements.combat.hidden = false;

    createEnemy();
    inCombat = true;

    renderOutput([
      `A ${enemy.name} appears!`,
      'Choose an action.'
    ]);
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
      elements.combatStats.textContent = formatPlayerStats();
    }
  }


  // --------------------------------------------------
  // SKILL MANAGEMENT
  // Generates buttons for the player's available skills.
  // --------------------------------------------------

  function renderSkillList() {
    // Remove any previously generated skill buttons.
    elements.skills.replaceChildren();

    player.skills.forEach(function (skill) {
      const button = document.createElement('button');
      button.type = 'button';
      button.classList.add(`skill-rarity-${skill.rarity}`);

      // Disable skills the player cannot currently afford or use.
      button.disabled = !player.canUseSkill(skill);

      button.textContent = `${skill.name} (${player.getSkillCost(skill)} MP)`;

      // Display a description of what the skill does.
      const description = document.createElement('small');
      description.textContent = skill.getDescription(player, enemy);
      button.appendChild(description);

      // Use the selected skill and process the combat turn.
      button.addEventListener('click', function () {
        takePlayerAction(function () {
          return player.useSkill(skill, enemy);
        });
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

      // Show the item name and quantity.
      button.textContent = `${item.name} (${player.inventory[item.id]})`;

      // Display the item's description.
      const description = document.createElement('small');
      description.textContent = item.description;
      button.appendChild(description);

      // Handle the item being selected.
      button.addEventListener('click', function () {
        if (!player.useItem(item)) return;

        container.hidden = true;

        // Scanning items display enemy information.
        // Other items display a standard usage message.
        const message = item.effect.type === 'scan'
          ? RPG.describeEnemy(enemy)
          : `${player.name} uses a ${item.name}.`;

        if (consumesTurn) {
          // Combat items use the normal turn-processing system.
          takePlayerAction(function () {
            return message;
          });
        } else {
          // Preparation items do not consume a combat turn.
          renderPreparationPanel('inventory');
          renderOutput([message]);
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
  }


  // --------------------------------------------------
  // TURN PROCESSING
  // Handles the player's action, enemy response and
  // checks whether either combatant has been defeated.
  // --------------------------------------------------

  function takePlayerAction(action) {
    // Prevent any further actions after the game ends.
    if (gameOver) return;

    // Close all combat panels before processing the turn.
    elements.skills.hidden = true;
    elements.items.hidden = true;
    elements.combatStats.hidden = true;

    const messages = [];

    // Check whether the player is incapacitated.
    if (player.incapacitatedTurns > 0) {
      player.incapacitatedTurns -= 1;

      messages.push(
        `${player.name} is incapable and loses this turn.`
      );
    } else {
      if (player.preparePassive()) {
        messages.push('Deadeye is ready: the next attack is guaranteed to hit and critically hit.');
      }
      // Execute the selected player action.
      messages.push(action());
    }

    // Check whether the enemy was defeated by the player.
    if (!enemy.isAlive()) {
      handleEnemyDefeat(messages);
      return;
    }

    // Allow the enemy to take its turn.
    const enemyTurn = enemy.takeTurn(player);
    messages.push(...enemyTurn.messages);

    // Check whether the enemy was defeated during its turn.
    if (!enemy.isAlive()) {
      handleEnemyDefeat(messages);
      return;
    }

    // Check whether the player has been defeated.
    if (!player.isAlive()) {
      finishGame(messages);
      return;
    }

    // Apply end-of-turn effects to the player.
    player.endTurn();

    // Display all messages generated during the turn.
    renderOutput(messages);
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
    player.xp += encounter.xp;

    // Restore some MP after defeating the enemy.
    player.recoverMp(encounter.mpReward);

    // Add reward information to the combat log.
    messages.push(`${enemy.name} is defeated! Score: ${defeatedEnemies}.`);
    messages.push(`You gained ${encounter.xp} XP and ${gold} gold.`);

    // Hide the combat interface while the player progresses.
    elements.combat.hidden = true;
    inCombat = false;

    // Reset pending level-ups before calculating new ones.
    player.pendingLevelUps = 0;

    // Check whether the player has earned one or more level-ups.
    while (player.xp >= player.xpNeeded()) {
      player.xp -= player.xpNeeded();
      player.pendingLevelUps += 1;
    }

    // Show the level-up screen if necessary, then return to preparation.
    if (player.pendingLevelUps > 0) {
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
    elements.levelUp.hidden = false;
    elements.levelUp.replaceChildren();

    // Apply the player's level-up stat improvements.
    player.applyLevelGrowth();

    messages.push(
      '',
      `Level ${player.level}! All stats increased. Choose a skill to learn.`
    );

    renderOutput(messages);

    // Get the names of skills the player already knows.
    const learned = player.skills.map(function (skill) {
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
        player.addSkill(new RPG.Skill(definition));
        player.pendingLevelUps -= 1;

        // If more level-ups are pending, show another skill selection.
        if (player.pendingLevelUps > 0) {
          showLevelUp([`You learned ${definition.name}.`]);
        } else {
          // Otherwise, finish levelling and return to preparation.
          elements.levelUp.hidden = true;
          showPreparation([`You learned ${definition.name}.`]);
        }
      });

      elements.levelUp.appendChild(button);
    });

    // Handle the situation where all available skills are already learned.
    if (!available.length) {
      player.pendingLevelUps = 0;
      elements.levelUp.hidden = true;

      showPreparation(['All available skills have been learned.']);
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
    ];

    tabNames.forEach(function (tab) {
      const button = document.createElement('button');
      button.type = 'button';
      button.addEventListener('click', function () {
        renderShopTab(tab[0], content);
      });
      button.textContent = tab[1];
      tabs.appendChild(button);
    });
    elements.shop.appendChild(tabs);
    elements.shop.appendChild(content);
    renderShopTab('gear', content);

    // Add a button to leave the shop and enter preparation.
    const leave = document.createElement('button');
    leave.type = 'button';
    leave.textContent = 'Leave Shop';

    leave.addEventListener('click', showPreparation);

    elements.shop.appendChild(leave);
  }

  function chooseLevelUpSkills(pool, count) {
    const weights = { common: 80, rare: 18, legendary: 2 };
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

  function getUpgradeCost(type) {
    const upgrade = type === 'weapon'
      ? gameData.shop.weaponUpgrade : gameData.shop.armorUpgrade;
    const level = type === 'weapon' ? player.weaponLevel : player.armorLevel;
    return upgrade.baseCost + level * upgrade.costIncrease;
  }

  function renderShopTab(tabName, content) {
    content.replaceChildren();
    if (tabName === 'gear') {
      renderGearShop(content);
    } else if (tabName === 'consumables') {
      renderConsumableShop(content);
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
    const weaponCost = getUpgradeCost('weapon');
    const armorCost = getUpgradeCost('armor');
    addShopPurchaseButton(
      container,
      `Upgrade Weapon - ${weaponCost} gold`,
      `Level ${player.weaponLevel} -> ${player.weaponLevel + 1}; `
        + `Attack +${weapon.attackIncrease} (${player.attackPower} -> `
        + `${player.attackPower + weapon.attackIncrease}).`,
      player.gold < weaponCost,
      function () {
        if (player.gold < weaponCost) return;
        player.gold -= weaponCost;
        player.upgradeWeapon(weapon.attackIncrease);
        showShop([`Weapon upgraded to level ${player.weaponLevel}.`]);
      }
    );
    addShopPurchaseButton(
      container,
      `Upgrade Armor - ${armorCost} gold`,
      `Level ${player.armorLevel} -> ${player.armorLevel + 1}; `
        + `Defense +${armor.defenseIncrease} (${player.defense} -> `
        + `${player.defense + armor.defenseIncrease}).`,
      player.gold < armorCost,
      function () {
        if (player.gold < armorCost) return;
        player.gold -= armorCost;
        player.upgradeArmor(armor.defenseIncrease);
        showShop([`Armor upgraded to level ${player.armorLevel}.`]);
      }
    );
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
    const learned = player.skills.map(function (skill) {
      return skill.name;
    });
    const available = gameData.levelUpSkills.filter(function (definition) {
      return !learned.includes(definition.name);
    });
    if (!available.length) {
      const empty = document.createElement('p');
      empty.textContent = 'You have learned every available skill.';
      container.appendChild(empty);
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
          player.addSkill(new RPG.Skill(definition));
          showShop([`You learned ${definition.name}.`]);
        }
      );
      container.lastElementChild.classList.add(`skill-rarity-${definition.rarity}`);
    });
  }

  function getSkillCost(definition) {
    return { common: 25, rare: 50, legendary: 100 }[definition.rarity];
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
    inCombat = false;

    renderOutput(messages || [
      'Review your inventory and stats, visit the shop, or start the next fight.'
    ]);
  }

  // Display either the inventory or player statistics.
  function renderPreparationPanel(view) {
    elements.preparationPanel.hidden = false;
    elements.preparationPanel.replaceChildren();

    // Show inventory items if inventory was selected.
    if (view === 'inventory') {
      renderItemList(elements.preparationPanel, false);
      return;
    }

    if (view === 'skills') {
      renderPreparationSkills();
      return;
    }

    // Otherwise, display the player's statistics.
    const stats = document.createElement('p');
    stats.textContent = formatPlayerStats();

    elements.preparationPanel.appendChild(stats);
  }

  function renderPreparationSkills() {
    if (!player.skills.length) {
      const empty = document.createElement('p');
      empty.textContent = 'No skills learned.';
      elements.preparationPanel.appendChild(empty);
      return;
    }
    player.skills.forEach(function (skill) {
      const skillEntry = document.createElement('p');
      skillEntry.classList.add(`skill-rarity-${skill.rarity}`);
      skillEntry.textContent = `${skill.name} [${skill.rarity}] - ${skill.description}`;
      elements.preparationPanel.appendChild(skillEntry);
    });
  }


  // --------------------------------------------------
  // PLAYER STATISTICS
  // Formats player and enemy information for display.
  // --------------------------------------------------

  // Generate a readable summary of the player's current stats.
  function formatPlayerStats() {
    return `Level ${player.level} ${player.className} | HP ${player.health}/${player.maxHealth} `
      + `| MP ${player.mp}/${player.maxMp} | Attack ${player.attackPower} `
      + `| Weapon Lv ${player.weaponLevel} | Defense ${player.defense} `
      + `| Armor Lv ${player.armorLevel} | XP ${player.xp}/${player.xpNeeded()} `
      + `| Dexterity ${player.dexterity} | Agility ${player.agility} `
      + `| Crit ${Math.round(player.critChance * 100)}% | Gold ${player.gold}`;
  }

  // Generate the complete combat status line.
  function formatStatus() {
    const enemyStatus = inCombat
      ? `${enemy.name}: ${enemy.health}/${enemy.maxHealth} HP`
      : `Gold: ${player.gold}`;
    return `Score: ${defeatedEnemies} | Level ${player.level} | `
      + `HP ${player.health}/${player.maxHealth} | MP ${player.mp}/${player.maxMp} | `
      + enemyStatus;
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
    elements.gameStatus.textContent = player ? formatStatus() : '';
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
