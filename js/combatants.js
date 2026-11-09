(function () {
  const gameData = window.GAME_DATA;
  const RPG = window.RPG;

  class Combatant {
    constructor(name, health, attack, defense, dexterity = 0, agility = 0, critChance = 0) {
      this.name = name;
      this.maxHealth = health;
      this.health = health;
      this.attackPower = attack;
      this.defense = defense;
      this.dexterity = dexterity;
      this.agility = agility;
      this.critChance = critChance;
      this.outgoingDamageMultiplier = 1;
      this.incomingDamageMultiplier = 1;
      this.chargeMultiplier = 1;
      this.statuses = {};
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
      return {
        damage: applyDamage ? this.takeDamage(Math.floor(amount * multiplier))
          : Math.floor(amount * multiplier),
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
      const critical = guaranteed || Math.random() <= this.critChance;
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

    addStatus(name, duration) {
      this.statuses[name] = Math.max(this.statuses[name] || 0, duration);
      this.refreshStatusEffects();
    }

    tickStatuses() {
      Object.keys(this.statuses).forEach(function (name) {
        this.statuses[name] -= 1;
        if (this.statuses[name] <= 0) delete this.statuses[name];
      }, this);
      this.refreshStatusEffects();
    }

    refreshStatusEffects() {
      this.outgoingDamageMultiplier = this.statuses.weaken ? 0.75 : 1;
      this.incomingDamageMultiplier = this.statuses.brittle ? 1.25 : 1;
      this.spellCostReduction = this.statuses.channelAether ? 3 : 0;
      this.regenerationPercent = this.statuses.channelAether ? 0.05 : 0;
    }
  }

  class Player extends Combatant {
    constructor(classData) {
      super(classData.name, classData.health, classData.attack, classData.defense,
        classData.dexterity, classData.agility, classData.critChance);
      this.className = classData.name;
      this.maxMp = classData.maxMp;
      this.mp = classData.maxMp;
      this.isDefending = false;
      this.skills = [];
      this.damageBuff = 0;
      this.incapacitatedTurns = 0;
      this.level = 1;
      this.xp = 0;
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
    useItem(item) {
      if (!this.hasItem(item.id)) return false;
      this.inventory[item.id] -= 1;
      if (item.effect.type === 'heal') this.heal(item.effect.amount);
      if (item.effect.type === 'mp') this.recoverMp(item.effect.amount);
      return true;
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
      const berserkBonus = this.statuses.berserk ? 0.25 : 0;
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
      dexterity, agility, critChance) {
      super(name, health, attack, defense, dexterity, agility, critChance);
      this.attackChance = attackChance;
      this.weaknesses = weaknesses;
      this.resistance = resistance;
      this.poisonTurns = 0;
      this.poisonDamage = 0;
      this.paralyzedTurns = 0;
      this.sleepTurns = 0;
      this.dotTurns = 0;
      this.dotDamage = 0;
      this.dotDamageType = 'normal';
    }
    applyPoison(damage, duration) {
      this.poisonDamage = damage;
      this.poisonTurns = Math.max(this.poisonTurns, duration);
    }
    applyParalysis(duration) {
      this.paralyzedTurns = Math.max(this.paralyzedTurns, duration);
    }
    applyDamageOverTime(damage, duration, damageType) {
      this.dotDamage = damage;
      this.dotTurns = Math.max(this.dotTurns, duration);
      this.dotDamageType = damageType;
    }
    applySleep(duration) { this.sleepTurns = Math.max(this.sleepTurns, duration); }
    takeTurn(target) {
      const messages = [];
      if (this.poisonTurns > 0 || this.dotTurns > 0) {
        const damage = this.poisonTurns > 0 ? this.poisonDamage : this.dotDamage;
        const damageType = this.poisonTurns > 0 ? 'wind' : this.dotDamageType;
        const result = this.getDamageResult(damage, damageType);
        this.poisonTurns -= this.poisonTurns > 0 ? 1 : 0;
        this.dotTurns -= this.dotTurns > 0 ? 1 : 0;
        messages.push(`${this.name} takes ${result.damage} damage`
          + RPG.formatEffectiveness(result.effectiveness) + '.');
        if (!this.isAlive()) return this.finishTurn(messages, false);
      }
      if (this.sleepTurns > 0) {
        this.sleepTurns -= 1;
        messages.push(`${this.name} is asleep and cannot act.`);
        return this.finishTurn(messages, false);
      }
      if (this.paralyzedTurns > 0) {
        this.paralyzedTurns -= 1;
        messages.push(`${this.name} is paralyzed and cannot attack.`);
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
