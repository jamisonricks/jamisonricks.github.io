(function () {
  const RPG = window.RPG;

  class Skill {
    constructor(definition) {
      this.name = definition.name;
      this.mpCost = definition.mpCost;
      this.description = definition.description;
      this.effect = definition.effect;
    }

    getDescription(player, target) {
      const effect = this.effect;
      if (!['damage', 'poison', 'paralyze', 'damageOverTime', 'lifeSteal', 'execute']
        .includes(effect.type)) return this.description;
      const baseDamage = Math.max(0, player.getAttackPower() + effect.powerBonus
        + player.damageBuff - target.getDefense());
      const result = target.getDamageResult(baseDamage, effect.damageType, false);
      const damageOverTime = ['poison', 'damageOverTime'].includes(effect.type)
        ? ` + ${effect.damage} damage over ${effect.duration} turns` : '';
      return `${this.description} Damage: ${result.damage}${damageOverTime}.`;
    }

    use(player, target) {
      const effect = this.effect;
      const damageBonus = player.damageBuff;
      const damage = function () {
        const base = Math.max(0, player.getAttackPower() + effect.powerBonus
          + damageBonus - target.getDefense());
        return target.getDamageResult(base, effect.damageType);
      };
      if (effect.type === 'damage') {
        player.damageBuff = 0;
        const result = damage();
        return `${this.name} hits ${target.name} for ${result.damage} damage`
          + RPG.formatEffectiveness(result.effectiveness) + '.';
      }
      if (effect.type === 'heal') return `${player.name} restores ${player.heal(effect.amount)} HP.`;
      if (effect.type === 'poison') {
        player.damageBuff = 0;
        const result = damage();
        target.applyPoison(effect.damage, effect.duration);
        return `${this.name} hits for ${result.damage} damage`
          + RPG.formatEffectiveness(result.effectiveness) + ` and poisons ${target.name}.`;
      }
      if (effect.type === 'paralyze') {
        player.damageBuff = 0;
        const result = damage();
        target.applyParalysis(effect.duration);
        return `${this.name} hits for ${result.damage} damage`
          + RPG.formatEffectiveness(result.effectiveness) + ` and paralyzes ${target.name}.`;
      }
      if (effect.type === 'scan') return RPG.describeEnemy(target);
      if (effect.type === 'damageOverTime') {
        player.damageBuff = 0;
        const result = damage();
        target.applyDamageOverTime(effect.damage, effect.duration, effect.damageType);
        return `${this.name} hits for ${result.damage} damage`
          + RPG.formatEffectiveness(result.effectiveness) + ' and applies damage over time.';
      }
      if (effect.type === 'lifeSteal') {
        player.damageBuff = 0;
        const result = damage();
        const healed = player.heal(Math.floor(result.damage * effect.healPercent));
        return `${this.name} hits for ${result.damage} damage`
          + RPG.formatEffectiveness(result.effectiveness) + ` and restores ${healed} HP.`;
      }
      if (effect.type === 'sleep') {
        if (Math.random() <= effect.chance) {
          target.applySleep(effect.duration);
          return `${this.name} puts ${target.name} to sleep for ${effect.duration} turns.`;
        }
        return `${this.name} fails to put ${target.name} to sleep.`;
      }
      if (effect.type === 'attackBuff') {
        player.attackBuff += effect.percent;
        return `${player.name}'s attack rises by ${effect.percent * 100}%.`;
      }
      if (effect.type === 'defenseBuff') {
        player.defenseBuff += effect.percent;
        return `${player.name}'s defense rises by ${effect.percent * 100}%.`;
      }
      if (effect.type === 'execute') {
        player.damageBuff = 0;
        if (Math.random() <= effect.chance) {
          target.takeDamage(target.health);
          return `${this.name} instantly defeats ${target.name}!`;
        }
        const result = damage();
        return `${this.name} hits for ${result.damage} damage`
          + RPG.formatEffectiveness(result.effectiveness) + '.';
      }
      return `${this.name} has no effect.`;
    }
  }

  class Item {
    constructor(definition) {
      Object.assign(this, definition);
    }
  }

  RPG.Skill = Skill;
  RPG.Item = Item;
})();
