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
      this.dexterityPercent = 0;
    }

    isAlive() {
      return this.health > 0;
    }

    takeDamage(amount) {
      const damage = Math.max(0, amount);
      this.health = Math.max(0, this.health - damage);
      return damage;
    }

    getDamageResult(amount, damageType, applyDamage = true) {
      if (applyDamage && this.preventNextHit) {
        this.preventNextHit = false;
        return { damage: 0, effectiveness: 'normal', prevented: true };
      }
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
      const reducedDamage = this.isDefending && amount > 0
        ? Math.max(1, Math.floor(amount * multiplier * 0.8))
        : Math.floor(amount * multiplier);
      return {
        damage: applyDamage ? this.takeDamage(reducedDamage) : reducedDamage,
        effectiveness: isWaking ? 'sleep' : isWeak ? 'weak' : isResisted ? 'resisted' : 'normal',
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
      guaranteed = false) {
      const hitChance = guaranteed ? 1 : this.getHitChance(target);
      if (Math.random() > hitChance) {
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
        damage * attackMultiplier * chargedMultiplier * this.outgoingDamageMultiplier,
        damageType
      );
      if (result.hit !== false && result.damage > 0) this.removeConsumedEffects();
      return Object.assign(result, { hit: true, critical });
    }

    getHitChance(target) {
      return Math.max(0.1, Math.min(0.95,
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
      const remainingDuration = definition.duration === null
        ? null : definition.duration + durationOffset;
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
        dexterityPercent: 0,
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
    getAgility() { return Math.floor(this.agility * (1 + this.agilityPercent)); }
    getDexterity() { return Math.floor(this.dexterity * (1 + this.dexterityPercent)); }
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
      this.weaponLevel = 0;
      this.armorLevel = 0;
      this.passive = classData.passive;
      this.passiveType = classData.name;
      this.preventNextHit = classData.name === 'Knight';
      this.guaranteedAttackReady = false;
      this.passiveTurns = classData.name === 'Archer' ? RPG.getRandomInt(3) + 2 : 0;
      this.classData = classData;
      this.pendingLevelUps = 0;
    }

    addSkill(skill) { this.skills.push(skill); }
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
    upgradeWeapon(amount) {
      this.attackPower += amount;
      this.weaponLevel += 1;
    }
    upgradeArmor(amount) {
      this.defense += amount;
      this.armorLevel += 1;
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
      this.preventNextHit = this.passiveType === 'Knight';
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
    takeTurn(target) {
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
      if (Math.random() > this.attackChance) {
        messages.push(`${this.name} does not attack this turn.`);
        return this.finishTurn(messages, false);
      }
      const result = this.attackWithResult(target, target.isDefending ? 2 : 0);
      messages.push(RPG.formatAttackResult(this, target, result));
      return this.finishTurn(messages, true);
    }
    finishTurn(messages, attacked) {
      messages.push(...this.processTurnEffects());
      this.processEndOfTurnEffects();
      return { messages, attacked };
    }
  }

  RPG.Combatant = Combatant;
  RPG.Player = Player;
  RPG.Enemy = Enemy;
})();
