(function () {
  const gameData = window.GAME_DATA;
  const RPG = window.RPG;

  class Combatant {
    constructor(name, health, attack, defense, dexterity = 0, agility = 0, critChance = 0,
      speed = 0) {
      this.name = name;
      this.maxHealth = health;
      this.health = health;
      this.attackPower = attack;
      this.defense = defense;
      this.dexterity = dexterity;
      this.agility = agility;
      this.critChance = critChance;
      this.critChanceBonus = 0;
      this.speed = speed;
      this.outgoingDamageMultiplier = 1;
      this.incomingDamageMultiplier = 1;
      this.chargeMultiplier = 1;
      this.activeEffects = [];
      this.nextEffectInstanceId = 1;
      this.attackPowerPercent = 0;
      this.defensePercent = 0;
      this.healthRegenerationPercent = 0;
      this.manaRegenerationPercent = 0;
      this.spellCostReduction = 0;
      this.speedPercent = 0;
      this.agilityPercent = 0;
      this.agilityBonus = 0;
      this.hateBonus = 0;
      this.dexterityPercent = 0;
      this.dexterityBonus = 0;
    }

    isAlive() {
      return this.health > 0;
    }

    takeDamage(amount) {
      const damage = Math.max(0, amount);
      this.health = Math.max(0, this.health - damage);
      return damage;
    }

    getDamageResult(amount, damageType, applyDamage = true, isAttack = false) {
      const bulwark = applyDamage && isAttack && this.bulwarkReady;
      if (bulwark) this.bulwarkReady = false;
      const isWeak = (this.weaknesses || []).includes(damageType);
      const isResisted = this.resistance === damageType;
      const isWaking = this.hasActiveEffect('sleep');
      const multiplier = (isWeak
        ? gameData.damageTypes[damageType].multiplier
        : isResisted ? gameData.resistanceMultiplier : 1) * (isWaking ? 1.2 : 1)
        * this.incomingDamageMultiplier;
      if (isWaking && applyDamage) {
        this.removeActiveEffect('sleep');
      }
      const defenseMultiplier = this.isDefending ? 0.8 : 1;
      let reducedDamage = Math.floor(
        amount * multiplier * defenseMultiplier * (bulwark ? 0.2 : 1)
      );
      if (this.isDefending && amount > 0 && !bulwark) {
        reducedDamage = Math.max(1, reducedDamage);
      }
      return {
        damage: applyDamage ? this.takeDamage(reducedDamage) : reducedDamage,
        effectiveness: isWaking ? 'sleep' : isWeak ? 'weak' : isResisted ? 'resisted' : 'normal',
        bulwark,
      };
    }

    heal(amount) {
      const previousHealth = this.health;
      this.health = Math.min(this.maxHealth, this.health + Math.max(0, amount));
      return this.health - previousHealth;
    }

    attack(target, defenseBonus = 0, damageBonus = 0, damageType = 'normal') {
      return this.attackWithResult(target, defenseBonus, damageBonus, damageType).damage;
    }

    attackWithResult(target, defenseBonus = 0, damageBonus = 0, damageType = 'normal',
      guaranteed = false, damageMultiplier = 1) {
      const hitChance = guaranteed ? 1 : this.getHitChance(target);
      if (Math.random() >= hitChance) {
        return { damage: 0, effectiveness: 'normal', hit: false, critical: false };
      }
      const critical = guaranteed || Math.random() <= this.critChance + this.critChanceBonus;
      const damage = Math.max(
        0,
        this.getAttackPower() + damageBonus - target.getDefense() - defenseBonus,
      );
      const attackMultiplier = critical ? 1.5 : 1;
      const chargedMultiplier = this.chargeMultiplier;
      const result = target.getDamageResult(
        damage * attackMultiplier * chargedMultiplier * this.outgoingDamageMultiplier
          * damageMultiplier,
        damageType, true, true
      );
      if (result.hit !== false && result.damage > 0) this.removeConsumedEffects();
      if (!result.prevented && target instanceof Enemy && target.isAlive()
        && this.hasArtifact && this.hasArtifact('firestarter') && Math.random() < 0.2) {
        target.applyStatusEffect('burn', `Firestarter: ${this.name}`, { duration: 1 });
        result.firestarterBurn = true;
      }
      return Object.assign(result, { hit: true, critical });
    }

    getHitChance(target) {
      return Math.max(0, Math.min(1,
        0.75 + (this.getDexterity() - target.getAgility()) * 0.03));
    }

    getAttackPower() {
      return Math.floor(this.attackPower * (1 + this.attackPowerPercent));
    }

    getDefense() {
      return Math.floor(this.defense * (1 + this.defensePercent));
    }

    applyStatusEffect(effectId, sourceId, options = {}) {
      const definition = gameData.statusEffects[effectId];
      if (!definition) throw new Error(`Unknown status effect: ${effectId}`);
      if (definition.chance !== undefined && Math.random() > definition.chance) return false;

      const durationOffset = options.durationOffset || 0;
      const duration = options.duration === undefined ? definition.duration : options.duration;
      const remainingDuration = duration === null ? null : duration + durationOffset;
      const existing = definition.stacking === 'stack' ? null
        : this.activeEffects.find(function (instance) {
          return instance.effectId === effectId && instance.sourceId === sourceId;
        });
      if (existing) {
        if (remainingDuration !== null) {
          existing.remainingDuration = Math.max(existing.remainingDuration, remainingDuration);
          existing.durationOffset = Math.max(existing.durationOffset, durationOffset);
        }
        existing.data = Object.assign(existing.data, options.data || {});
      } else {
        this.activeEffects.push({
          instanceId: this.nextEffectInstanceId,
          effectId,
          sourceId,
          remainingDuration,
          durationOffset,
          data: Object.assign({}, options.data),
        });
        this.nextEffectInstanceId += 1;
      }
      this.refreshStatusEffects();
      return true;
    }

    hasActiveEffect(effectId) {
      return this.activeEffects.some(function (instance) {
        return instance.effectId === effectId;
      });
    }

    removeActiveEffect(effectId, sourceId) {
      this.activeEffects = this.activeEffects.filter(function (instance) {
        return instance.effectId !== effectId
          || (sourceId !== undefined && instance.sourceId !== sourceId);
      });
      this.refreshStatusEffects();
    }

    removeConsumedEffects() {
      this.activeEffects = this.activeEffects.filter(function (instance) {
        return !gameData.statusEffects[instance.effectId].consumeOnSuccessfulHit;
      });
      this.refreshStatusEffects();
    }

    processTurnEffects() {
      const messages = [];
      this.activeEffects.slice().forEach(function (instance) {
        if (!this.isAlive()) return;
        const definition = gameData.statusEffects[instance.effectId];
        if (definition.category !== 'damageOverTime') return;
        const result = this.getDamageResult(definition.damage, definition.damageType);
        messages.push(`${this.name} took ${result.damage} damage from ${definition.name}`
          + RPG.formatEffectiveness(result.effectiveness) + '.');
      }, this);
      return messages;
    }

    applyRegenerationEffects() {
      if (this.healthRegenerationPercent) {
        this.heal(this.maxHealth * this.healthRegenerationPercent);
      }
      if (this.manaRegenerationPercent && this.recoverMp) {
        this.recoverMp(this.maxMp * this.manaRegenerationPercent);
      }
    }

    processEndOfTurnEffects() {
      this.tickActiveEffects();
      this.applyRegenerationEffects();
    }

    tickActiveEffects() {
      this.activeEffects.forEach(function (instance) {
        if (instance.remainingDuration === null) return;
        instance.remainingDuration -= 1;
        instance.durationOffset = 0;
      });
      this.activeEffects = this.activeEffects.filter(function (instance) {
        return instance.remainingDuration === null || instance.remainingDuration > 0;
      });
      this.refreshStatusEffects();
    }

    clearActiveEffects() {
      this.activeEffects = [];
      this.refreshStatusEffects();
    }

    isIncapacitated() {
      return this.hasActiveEffect('sleep') || this.hasActiveEffect('stun');
    }

    getActiveEffectSummary() {
      return this.activeEffects.map(function (instance) {
        const definition = gameData.statusEffects[instance.effectId];
        let duration = 'until combat ends';
        if (definition.consumeOnSuccessfulHit) {
          duration = 'until next successful hit';
        } else if (instance.remainingDuration !== null) {
          duration = `${Math.max(0, instance.remainingDuration - instance.durationOffset)} turns`;
        }
        return `${definition.name} (${duration})`;
      }).join(', ');
    }

    refreshStatusEffects() {
      const values = {
        outgoingDamageMultiplier: 1,
        incomingDamageMultiplier: 1,
        chargeMultiplier: 1,
        attackPowerPercent: 0,
        defensePercent: 0,
        healthRegenerationPercent: 0,
        manaRegenerationPercent: 0,
        spellCostReduction: 0,
        critChanceBonus: 0,
        speedPercent: 0,
        agilityPercent: 0,
        agilityBonus: 0,
        hateBonus: 0,
        dexterityPercent: 0,
        dexterityBonus: 0,
      };
      const appliedEffectIds = new Set();
      this.activeEffects.forEach(function (instance) {
        const definition = gameData.statusEffects[instance.effectId];
        if (definition.stacking !== 'stack' && appliedEffectIds.has(instance.effectId)) return;
        appliedEffectIds.add(instance.effectId);
        Object.keys(definition.modifiers || {}).forEach(function (key) {
          const value = definition.modifiers[key];
          if (key === 'outgoingDamageMultiplier' || key === 'incomingDamageMultiplier') {
            values[key] *= value;
          } else if (key === 'chargeMultiplier') {
            values[key] = Math.max(values[key], value);
          } else if (Object.prototype.hasOwnProperty.call(values, key)) {
            values[key] += value;
          }
        });
      });
      Object.assign(this, values);
    }

    getSpeed() { return Math.floor(this.speed * (1 + this.speedPercent)); }
    getAgility() { return Math.floor(this.agility * (1 + this.agilityPercent)) + this.agilityBonus; }
    getHate() { return 1 + this.hateBonus; }
    getDexterity() {
      return Math.floor(this.dexterity * (1 + this.dexterityPercent)) + this.dexterityBonus;
    }
  }

  class Player extends Combatant {
    constructor(classData) {
      super(classData.name, classData.health, classData.attack, classData.defense,
        classData.dexterity, classData.agility, classData.critChance, classData.speed);
      this.className = classData.name;
      this.icon = classData.icon;
      this.maxMp = classData.maxMp;
      this.mp = classData.maxMp;
      this.isDefending = false;
      this.skills = [];
      this.damageBuff = 0;
      this.level = 1;
      this.xp = 0;
      this.totalXp = 0;
      this.gold = 0;
      this.inventory = {};
      this.artifacts = [];
      this.passive = classData.passive;
      this.passiveType = classData.name;
      this.bulwarkReady = classData.name === 'Knight';
      this.guaranteedAttackReady = false;
      this.passiveTurns = classData.name === 'Archer' ? RPG.getRandomInt(3) + 2 : 0;
      this.classData = classData;
      this.pendingLevelUps = 0;
    }

    addSkill(skill) { this.skills.push(skill); }
    hasArtifact(id) { return this.artifacts.includes(id); }
    equipArtifact(id) {
      const artifact = gameData.artifacts.find(function (definition) { return definition.id === id; });
      if (!artifact) throw new Error(`Unknown artifact: ${id}`);
      if (this.hasArtifact(id)) throw new Error(`${this.name} already has ${artifact.name}.`);
      this.artifacts.push(id);
      if (id === 'smoke-bomb') this.agility += 20;
      if (id === 'ancient-tome') this.maxMp += 10;
    }
    getMultiTargetDamageMultiplier(enemyCount) {
      return this.hasArtifact('mana-condenser')
        ? 1 + Math.max(0, 5 - enemyCount) * 0.2 : 1;
    }
    applyRegenerationEffects() {
      super.applyRegenerationEffects();
      if (this.hasArtifact('band-of-life')) this.heal(this.maxHealth * 0.05);
    }
    getSkillCost(skill) {
      if (skill.additionalEffects.some(function (effect) {
        return effect.type === 'maxHealthReduction';
      }) && this.maxHealth <= 1) return Infinity;
      return Math.max(0, skill.mpCost - (this.spellCostReduction || 0));
    }
    canUseSkill(skill) { return this.mp >= this.getSkillCost(skill); }
    useSkill(skill, target) {
      this.mp -= this.getSkillCost(skill);
      return skill.use(this, target);
    }
    recoverMp(amount) { this.mp = Math.min(this.maxMp, this.mp + amount); }
    xpNeeded() {
      return gameData.progression.firstLevelXp
        + (this.level - 1) * gameData.progression.xpIncreasePerLevel;
    }
    addItem(itemId) {
      this.inventory[itemId] = (this.inventory[itemId] || 0) + 1;
    }
    hasItem(itemId) { return (this.inventory[itemId] || 0) > 0; }
    useItem(item, target = this) {
      if (!this.hasItem(item.id)) return false;
      const result = item.use(this, target);
      if (!result.success) return false;
      this.inventory[item.id] -= 1;
      return result;
    }
    applyLevelGrowth() {
      const growth = gameData.progression.statGrowth;
      this.level += 1;
      this.maxHealth += growth.health;
      this.attackPower += growth.attack;
      this.defense += growth.defense;
      this.maxMp += growth.maxMp;
      this.health = this.maxHealth;
      this.mp = this.maxMp;
    }
    getAttackPower() {
      return Math.floor(this.attackPower * (1 + this.attackPowerPercent));
    }
    getDefense() { return Math.floor(this.defense * (1 + this.defensePercent)); }
    resetCombatBuffs() {
      this.clearActiveEffects();
      this.isDefending = false;
      this.bulwarkReady = this.passiveType === 'Knight';
      this.guaranteedAttackReady = false;
      this.passiveTurns = this.passiveType === 'Archer' ? RPG.getRandomInt(3) + 2 : 0;
    }
    preparePassive() {
      if (this.passiveType !== 'Archer' || this.guaranteedAttackReady) return false;
      this.passiveTurns -= 1;
      if (this.passiveTurns > 0) return false;
      this.guaranteedAttackReady = true;
      this.passiveTurns = RPG.getRandomInt(3) + 2;
      return true;
    }
    consumeGuaranteedAttack() {
      const ready = this.guaranteedAttackReady;
      this.guaranteedAttackReady = false;
      return ready;
    }
    defend() { this.isDefending = true; }
  }

  class Enemy extends Combatant {
    constructor(name, health, attack, defense, attackChance, weaknesses, resistance,
      dexterity, agility, critChance, speed) {
      super(name, health, attack, defense, dexterity, agility, critChance, speed);
      this.attackChance = attackChance;
      this.weaknesses = weaknesses;
      this.resistance = resistance;
    }
    takeTurn(target, party = [target], defendingMembers = []) {
      const messages = [];
      if (!this.isAlive()) return this.finishTurn(messages, false);
      if (this.hasActiveEffect('sleep')) {
        messages.push(`${this.name} is asleep and cannot act.`);
        return this.finishTurn(messages, false);
      }
      if (this.hasActiveEffect('stun')) {
        messages.push(`${this.name} is stunned and cannot act.`);
        return this.finishTurn(messages, false);
      }
      if (!this.hasPreparedAttack() && Math.random() >= Math.min(1, this.attackChance)) {
        messages.push(`${this.name} does not attack this turn.`);
        return this.finishTurn(messages, false);
      }
      const attacked = this.performTurnAttack(target, party, defendingMembers, messages);
      return this.finishTurn(messages, attacked);
    }
    hasPreparedAttack() { return false; }
    performTurnAttack(target, party, defendingMembers, messages) {
      const result = this.attackWithResult(target, target.isDefending ? 2 : 0);
      messages.push(RPG.formatAttackResult(this, target, result));
      return true;
    }
    finishTurn(messages, attacked) {
      messages.push(...this.processTurnEffects());
      this.processEndOfTurnEffects();
      return { messages, attacked };
    }
  }

  function createScaledEnemy(definition, scaling, level, name) {
    const stat = function (key) {
      return Math.floor(definition[key] + scaling[key] * level);
    };
    const enemy = new Enemy(
      name, stat('health'), stat('attack'), stat('defense'),
      definition.attackChance + scaling.attackChance * level,
      definition.weaknesses.slice(), definition.resistance,
      stat('dexterity'), stat('agility'),
      Math.min(scaling.maxCritChance, definition.critChance + scaling.critChance * level),
      stat('speed')
    );
    enemy.icon = definition.icon;
    return enemy;
  }

  class Boss extends Enemy {
    constructor(definition, level) {
      const scaled = createScaledEnemy(definition, gameData.bossScaling, level, definition.name);
      super(scaled.name, scaled.maxHealth, scaled.attackPower, scaled.defense,
        scaled.attackChance, scaled.weaknesses, scaled.resistance,
        scaled.dexterity, scaled.agility, scaled.critChance, scaled.speed);
      this.icon = definition.icon;
      this.id = definition.id;
      this.reinforcement = definition.reinforcement;
      this.encounterLevel = level;
      this.reinforcementsCalled = false;
      this.reinforcementsPending = false;
    }

    takeDamage(amount) {
      const previousHealth = this.health;
      const damage = super.takeDamage(amount);
      if (this.reinforcement && !this.reinforcementsCalled && previousHealth > this.maxHealth / 2
        && this.health <= this.maxHealth / 2) {
        this.reinforcementsCalled = true;
        this.reinforcementsPending = true;
      }
      return damage;
    }

    takeReinforcements() {
      if (!this.reinforcementsPending) return [];
      this.reinforcementsPending = false;
      return Array.from({ length: this.reinforcement.count }, function (_, index) {
        return createScaledEnemy(this.reinforcement, gameData.reinforcementScaling,
          this.encounterLevel, `${this.reinforcement.name} ${index + 1}`);
      }, this);
    }
  }

  class Executioner extends Boss {
    constructor(definition, level) {
      super(definition, level);
      this.executionTarget = null;
    }
    hasPreparedAttack() { return this.executionTarget !== null; }
    getExecutionWarning() {
      return this.executionTarget
        ? `${this.name} prepares to execute ${this.executionTarget.className}! Defend next turn!`
        : '';
    }
    performTurnAttack(target, party, defendingMembers, messages) {
      if (this.executionTarget) {
        const victim = this.executionTarget;
        this.executionTarget = null;
        if (!victim.isAlive()) {
          messages.push(`${this.name}'s execution fails: ${victim.name} is already defeated.`);
          return false;
        }
        const defended = victim.isDefending || defendingMembers.includes(victim);
        const damage = defended ? Math.floor(victim.health * 0.8) : victim.health;
        victim.takeDamage(damage);
        messages.push(`${this.name} executes ${victim.name} for ${damage} damage`
          + (defended ? ' (defended).' : '.'));
        return true;
      }
      const attack = RPG.getRandomInt(3);
      if (attack === 2) {
        this.executionTarget = target;
        messages.push(this.getExecutionWarning());
        return false;
      }
      if (attack === 1) {
        messages.push(`${this.name} attacks the entire party!`);
        party.filter(function (member) { return member.isAlive(); }).forEach(function (member) {
          const result = this.attackWithResult(member, member.isDefending ? 2 : 0);
          messages.push(RPG.formatAttackResult(this, member, result));
        }, this);
        return true;
      }
      return super.performTurnAttack(target, party, defendingMembers, messages);
    }
  }

  RPG.createBoss = function (encounterLevel, previousBossId = null) {
    const choices = encounterLevel === 0
      ? gameData.bosses.filter(function (definition) { return definition.id === 'precursor'; })
      : gameData.bosses.filter(function (definition) { return definition.id !== previousBossId; });
    if (!choices.length) throw new Error('No eligible boss available for this encounter.');
    const definition = choices.length === 1 ? choices[0] : choices[RPG.getRandomInt(choices.length)];
    return definition.id === 'executioner'
      ? new Executioner(definition, encounterLevel) : new Boss(definition, encounterLevel);
  };
  RPG.Combatant = Combatant;
  RPG.Player = Player;
  RPG.Enemy = Enemy;
})();
