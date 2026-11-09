(function () {
  const gameData = window.GAME_DATA;
  const RPG = window.RPG;

  class Combatant {
    constructor(name, health, attack, defense) {
      this.name = name;
      this.maxHealth = health;
      this.health = health;
      this.attackPower = attack;
      this.defense = defense;
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
      const isWeak = (this.weaknesses || []).includes(damageType);
      const isResisted = this.resistance === damageType;
      const isWaking = this.sleepTurns > 0;
      const multiplier = (isWeak
        ? gameData.damageTypes[damageType].multiplier
        : isResisted ? gameData.resistanceMultiplier : 1) * (isWaking ? 1.2 : 1);
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

    attackWithResult(target, defenseBonus = 0, damageBonus = 0, damageType = 'normal') {
      const damage = Math.max(
        0,
        this.getAttackPower() + damageBonus - target.getDefense() - defenseBonus,
      );
      return target.getDamageResult(damage, damageType);
    }

    getAttackPower() {
      return this.attackPower;
    }

    getDefense() {
      return this.defense;
    }
  }

  class Player extends Combatant {
    constructor(classData) {
      super(classData.name, classData.health, classData.attack, classData.defense);
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
    }

    addSkill(skill) { this.skills.push(skill); }
    canUseSkill(skill) { return this.mp >= skill.mpCost; }
    useSkill(skill, target) {
      this.mp -= skill.mpCost;
      return skill.use(this, target);
    }
    recoverMp(amount) { this.mp = Math.min(this.maxMp, this.mp + amount); }
    xpNeeded() {
      return gameData.progression.firstLevelXp
        + (this.level - 1) * gameData.progression.xpIncreasePerLevel;
    }
    addItem(itemId) { this.inventory[itemId] = (this.inventory[itemId] || 0) + 1; }
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
    getAttackPower() { return Math.floor(this.attackPower * (1 + this.attackBuff)); }
    getDefense() { return Math.floor(this.defense * (1 + this.defenseBuff)); }
    resetCombatBuffs() {
      this.attackBuff = 0;
      this.defenseBuff = 0;
    }
    defend() { this.isDefending = true; }
    endTurn() { this.isDefending = false; }
  }

  class Enemy extends Combatant {
    constructor(name, health, attack, defense, attackChance, weaknesses, resistance) {
      super(name, health, attack, defense);
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
        if (!this.isAlive()) return { messages, attacked: false };
      }
      if (this.sleepTurns > 0) {
        this.sleepTurns -= 1;
        messages.push(`${this.name} is asleep and cannot act.`);
        return { messages, attacked: false };
      }
      if (this.paralyzedTurns > 0) {
        this.paralyzedTurns -= 1;
        messages.push(`${this.name} is paralyzed and cannot attack.`);
        return { messages, attacked: false };
      }
      if (Math.random() > this.attackChance) {
        messages.push(`${this.name} does not attack this turn.`);
        return { messages, attacked: false };
      }
      const result = this.attackWithResult(target, target.isDefending ? 2 : 0);
      messages.push(`${this.name} attacks ${target.name} for ${result.damage} damage`
        + RPG.formatEffectiveness(result.effectiveness) + '.');
      return { messages, attacked: true };
    }
  }

  RPG.Combatant = Combatant;
  RPG.Player = Player;
  RPG.Enemy = Enemy;
})();
