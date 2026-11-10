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
      this.statuses = {};
      this.damageOverTimeEffects = {};
    }

    isAlive() {
      return this.health > 0;
    }

    takeDamage(amount) {
      const damage = Math.max(0, amount);
      this.health = Math.max(0, this.health - damage);
      return damage;
    }

    takeDamageByType(amount, damageType) {
      return this.getDamageResult(amount, damageType).damage;
    }

    getDamageResult(amount, damageType, applyDamage = true) {
      if (applyDamage && this.preventNextHit) {
        this.preventNextHit = false;
        return { damage: 0, effectiveness: 'normal', prevented: true };
      }
      const isWeak = (this.weaknesses || []).includes(damageType);
      const isResisted = this.resistance === damageType;
      const isWaking = this.sleepTurns > 0;
      const multiplier = (isWeak
        ? gameData.damageTypes[damageType].multiplier
        : isResisted ? gameData.resistanceMultiplier : 1) * (isWaking ? 1.2 : 1)
        * this.incomingDamageMultiplier;
      if (isWaking && applyDamage) {
        this.sleepTurns = 0;
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
      if (result.hit !== false && result.damage > 0) this.chargeMultiplier = 1;
      return Object.assign(result, { hit: true, critical });
    }

    getHitChance(target) {
      return Math.max(0.1, Math.min(0.95,
        0.75 + (this.dexterity - target.agility) * 0.03));
    }

    getAttackPower() {
      return this.attackPower;
    }

    getDefense() {
      return this.defense;
    }

    addStatus(name, duration, sourceId = name) {
      if (!this.statuses[name]) this.statuses[name] = {};
      this.statuses[name][sourceId] = Math.max(
        this.statuses[name][sourceId] || 0,
        duration
      );
      this.refreshStatusEffects();
    }

    hasStatus(name) {
      return Boolean(this.statuses[name]
        && Object.keys(this.statuses[name]).some(function (source) {
          return this.statuses[name][source] > 0;
        }, this));
    }

    tickStatuses() {
      Object.keys(this.statuses).forEach(function (name) {
        Object.keys(this.statuses[name]).forEach(function (sourceId) {
          this.statuses[name][sourceId] -= 1;
          if (this.statuses[name][sourceId] <= 0) {
            delete this.statuses[name][sourceId];
          }
        }, this);
        if (!Object.keys(this.statuses[name]).length) delete this.statuses[name];
      }, this);
      this.refreshStatusEffects();
    }

    refreshStatusEffects() {
      this.outgoingDamageMultiplier = this.hasStatus('weaken') ? 0.75 : 1;
      this.incomingDamageMultiplier = this.hasStatus('brittle') ? 1.25 : 1;
      this.spellCostReduction = this.hasStatus('channelAether') ? 3 : 0;
      this.regenerationPercent = this.hasStatus('channelAether') ? 0.05 : 0;
      this.critChanceBonus = this.hasStatus('criticalRush') ? 0.3 : 0;
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
      this.incapacitatedTurns = 0;
      this.level = 1;
      this.xp = 0;
      this.totalXp = 0;
      this.gold = 0;
      this.inventory = {};
      this.attackBuff = 0;
      this.defenseBuff = 0;
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
      if (skill.effect.type === 'noHoldsBarred' && this.maxHealth <= 1) return Infinity;
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
      this.health += growth.health;
      this.attackPower += growth.attack;
      this.defense += growth.defense;
      this.maxMp += growth.maxMp;
      this.mp += growth.maxMp;
    }
    getAttackPower() {
      const berserkBonus = this.hasStatus('berserk') ? 0.25 : 0;
      return Math.floor(this.attackPower * (1 + this.attackBuff + berserkBonus));
    }
    getDefense() { return Math.floor(this.defense * (1 + this.defenseBuff)); }
    resetCombatBuffs() {
      this.attackBuff = 0;
      this.defenseBuff = 0;
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
    endTurn() {
      this.isDefending = false;
      this.tickStatuses();
      if (this.regenerationPercent) this.heal(this.maxHealth * this.regenerationPercent);
    }
  }

  class Enemy extends Combatant {
    constructor(name, health, attack, defense, attackChance, weaknesses, resistance,
      dexterity, agility, critChance, speed) {
      super(name, health, attack, defense, dexterity, agility, critChance, speed);
      this.attackChance = attackChance;
      this.weaknesses = weaknesses;
      this.resistance = resistance;
      this.stunnedTurns = 0;
      this.sleepTurns = 0;
      this.dotTurns = 0;
      this.dotDamage = 0;
      this.dotDamageType = 'normal';
    }
    applyStun(duration) {
      this.stunnedTurns = Math.max(this.stunnedTurns, duration);
    }
    applyDamageOverTime(name, damage, duration, damageType, sourceId = name) {
      const existing = this.damageOverTimeEffects[sourceId];
      this.damageOverTimeEffects[sourceId] = {
        name,
        damage: existing ? Math.max(existing.damage, damage) : damage,
        duration: Math.max(existing ? existing.duration : 0, duration),
        damageType,
      };
    }
    applySleep(duration) { this.sleepTurns = Math.max(this.sleepTurns, duration); }
    takeTurn(target) {
      const messages = [];
      Object.keys(this.damageOverTimeEffects).forEach(function (sourceId) {
        if (!this.isAlive()) return;
        const dot = this.damageOverTimeEffects[sourceId];
        const result = this.getDamageResult(dot.damage, dot.damageType);
        messages.push(`${this.name} took ${result.damage} damage from ${dot.name}`
          + RPG.formatEffectiveness(result.effectiveness) + '.');
        dot.duration -= 1;
        if (dot.duration <= 0) delete this.damageOverTimeEffects[sourceId];
      }, this);
      if (!this.isAlive()) return this.finishTurn(messages, false);
      if (this.sleepTurns > 0) {
        this.sleepTurns -= 1;
        messages.push(`${this.name} is asleep and cannot act.`);
        return this.finishTurn(messages, false);
      }
      if (this.stunnedTurns > 0) {
        this.stunnedTurns -= 1;
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
      this.tickStatuses();
      return { messages, attacked };
    }
  }

  RPG.Combatant = Combatant;
  RPG.Player = Player;
  RPG.Enemy = Enemy;
})();
