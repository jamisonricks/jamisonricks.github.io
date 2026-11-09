
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
    preparationPanel: document.getElementById('preparation-panel')
  };

  // Core game state variables.
  let player;
  let enemy;
  let items;
  let defeatedEnemies = 0;
  let gameOver = false;

  // --------------------------------------------------
  // EVENT LISTENERS
  // Connect buttons in the HTML to their game functions.
  // --------------------------------------------------

  elements.start.addEventListener('click', showClassSelection);

  // Player attack button.
  document.getElementById('attack-button').addEventListener('click', function () {
    takePlayerAction(function () {
      const result = player.attackWithResult(enemy, 0, player.damageBuff);

      // Remove any temporary damage bonus after attacking.
      player.damageBuff = 0;

      return `${player.name} attacks ${enemy.name} for ${result.damage} damage`
        + RPG.formatEffectiveness(result.effectiveness) + '.';
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

  // Begin the next enemy encounter.
  document.getElementById('next-combat-button').addEventListener('click', startNextCombat);


  // --------------------------------------------------
  // GAME INITIALIZATION
  // Handles class selection and starting a new game.
  // --------------------------------------------------

  // Display the available player classes.
  function showClassSelection() {
    elements.start.hidden = true;
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
      description.textContent = classData.description;
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

    // Reset the game progress.
    defeatedEnemies = 0;
    gameOver = false;

    // Show the combat interface and hide class selection.
    elements.classSelection.hidden = true;
    elements.combat.hidden = false;

    // Create the first enemy without rendering an intermediate message.
    createEnemy();

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
      resistance
    );
  }

  // Start the next encounter after preparation is complete.
  function startNextCombat() {
    elements.preparation.hidden = true;
    elements.combat.hidden = false;

    createEnemy();

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

      // Disable skills the player cannot currently afford or use.
      button.disabled = !player.canUseSkill(skill);

      button.textContent = `${skill.name} (${skill.mpCost} MP)`;

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

    // Reset pending level-ups before calculating new ones.
    player.pendingLevelUps = 0;

    // Check whether the player has earned one or more level-ups.
    while (player.xp >= player.xpNeeded()) {
      player.xp -= player.xpNeeded();
      player.pendingLevelUps += 1;
    }

    // Show the level-up screen if necessary.
    // Otherwise, move directly to the shop.
    if (player.pendingLevelUps > 0) {
      showLevelUp(messages);
    } else {
      showShop(messages);
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
    const available = RPG.shuffle(
      gameData.levelUpSkills.filter(function (definition) {
        return !learned.includes(definition.name);
      })
    ).slice(0, 4);

    available.forEach(function (definition) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = definition.name;

      // Display the skill description and MP cost.
      const description = document.createElement('small');
      description.textContent = `${definition.description} (${definition.mpCost} MP)`;
      button.appendChild(description);

      // Add the selected skill to the player's skill list.
      button.addEventListener('click', function () {
        player.addSkill(new RPG.Skill(definition));
        player.pendingLevelUps -= 1;

        // If more level-ups are pending, show another skill selection.
        if (player.pendingLevelUps > 0) {
          showLevelUp([`You learned ${definition.name}.`]);
        } else {
          // Otherwise, finish levelling and proceed to the shop.
          elements.levelUp.hidden = true;
          showShop([`You learned ${definition.name}.`]);
        }
      });

      elements.levelUp.appendChild(button);
    });

    // Handle the situation where all available skills are already learned.
    if (!available.length) {
      player.pendingLevelUps = 0;
      elements.levelUp.hidden = true;

      showShop(['All available skills have been learned.']);
    }
  }


  // --------------------------------------------------
  // SHOP SYSTEM
  // Allows the player to spend gold on items before
  // entering the next encounter.
  // --------------------------------------------------

  function showShop(messages) {
    elements.shop.hidden = false;
    elements.shop.replaceChildren();

    messages.push('', 'Visit the shop before the next encounter.');

    renderOutput(messages);

    // Generate a shop button for each available item.
    items.forEach(function (item) {
      const button = document.createElement('button');
      button.type = 'button';

      // Prevent purchases the player cannot afford.
      button.disabled = player.gold < item.price;

      button.textContent = `${item.name} - ${item.price} gold`;

      // Display the item's description.
      const description = document.createElement('small');
      description.textContent = item.description;
      button.appendChild(description);

      // Handle item purchases.
      button.addEventListener('click', function () {
        if (player.gold < item.price) return;

        // Deduct the cost and add the item to the inventory.
        player.gold -= item.price;
        player.addItem(item.id);

        // Refresh the shop to update available purchases.
        showShop([`Purchased ${item.name}.`]);
      });

      elements.shop.appendChild(button);
    });

    // Add a button to leave the shop and enter preparation.
    const leave = document.createElement('button');
    leave.type = 'button';
    leave.textContent = 'Leave Shop';

    leave.addEventListener('click', showPreparation);

    elements.shop.appendChild(leave);
  }


  // --------------------------------------------------
  // PREPARATION SCREEN
  // Allows the player to review inventory and statistics
  // before beginning the next combat encounter.
  // --------------------------------------------------

  function showPreparation() {
    elements.shop.hidden = true;
    elements.preparation.hidden = false;
    elements.preparationPanel.hidden = true;

    renderOutput([
      'Shop complete. Review your inventory and stats before continuing.'
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

    // Otherwise, display the player's statistics.
    const stats = document.createElement('p');
    stats.textContent = formatPlayerStats();

    elements.preparationPanel.appendChild(stats);
  }


  // --------------------------------------------------
  // PLAYER STATISTICS
  // Formats player and enemy information for display.
  // --------------------------------------------------

  // Generate a readable summary of the player's current stats.
  function formatPlayerStats() {
    return `Level ${player.level} ${player.className} | HP ${player.health}/${player.maxHealth} `
      + `| MP ${player.mp}/${player.maxMp} | Attack ${player.attackPower} `
      + `| Defense ${player.defense} | XP ${player.xp}/${player.xpNeeded()} `
      + `| Gold ${player.gold}`;
  }

  // Generate the complete combat status line.
  function formatStatus() {
    return `Score: ${defeatedEnemies} | ${formatPlayerStats()} | `
      + `${enemy.name}: ${enemy.health}/${enemy.maxHealth} HP`;
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
