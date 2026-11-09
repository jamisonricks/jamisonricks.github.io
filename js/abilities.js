(function () {
  const RPG = window.RPG;

  class Skill {
    constructor(definition) {
      this.name = definition.name;
      this.rarity = definition.rarity || 'common';
      this.mpCost = definition.mpCost;
      this.description = definition.description;
      this.effect = definition.effect;
    }

    getDescription(player, target) {
      const effect = this.effect;
      if (!['damage', 'poison', 'paralyze', 'damageOverTime', 'lifeSteal', 'execute']
        .includes(effect.type)) return this.description;
      const baseDamage = Math.max(0, player.getAttackPower() + (effect.powerBonus || 0)
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
        const guaranteed = player.consumeGuaranteedAttack();
        return player.attackWithResult(target, 0, effect.powerBonus + damageBonus,
          effect.damageType, guaranteed);
      };
      if (effect.type === 'damage') {
        player.damageBuff = 0;
        const result = damage();
        return RPG.formatAttackResult(player, target, result).replace(
          `${player.name} attacks`, `${this.name} attacks`);
      }
      if (effect.type === 'heal') return `${player.name} restores ${player.heal(effect.amount)} HP.`;
      if (effect.type === 'poison') {
        player.damageBuff = 0;
        const result = damage();
        if (!result.hit) return `${this.name} misses and fails to poison ${target.name}.`;
        target.applyPoison(effect.damage, effect.duration);
        return `${RPG.formatAttackResult(player, target, result)}`
          + ` and poisons ${target.name}.`;
      }
      if (effect.type === 'paralyze') {
        player.damageBuff = 0;
        const result = damage();
        if (!result.hit) return `${this.name} misses and fails to paralyze ${target.name}.`;
        target.applyParalysis(effect.duration);
        return `${RPG.formatAttackResult(player, target, result)}`
          + ` and paralyzes ${target.name}.`;
      }
      if (effect.type === 'scan') return RPG.describeEnemy(target);
      if (effect.type === 'damageOverTime') {
        player.damageBuff = 0;
        const result = damage();
        if (!result.hit) return `${this.name} misses and fails to apply damage over time.`;
        target.applyDamageOverTime(effect.damage, effect.duration, effect.damageType);
        return `${RPG.formatAttackResult(player, target, result)}`
          + ' and applies damage over time.';
      }
      if (effect.type === 'lifeSteal') {
        player.damageBuff = 0;
        const result = damage();
        const healed = player.heal(Math.floor(result.damage * effect.healPercent));
        if (!result.hit) return `${this.name} misses and restores no HP.`;
        return `${RPG.formatAttackResult(player, target, result)}`
          + ` and restores ${healed} HP.`;
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
      if (effect.type === 'weaken') {
        target.addStatus('weaken', effect.duration);
        return `${target.name} is weakened and deals 25% less damage for ${effect.duration} turns.`;
      }
      if (effect.type === 'brittle') {
        target.addStatus('brittle', effect.duration);
        return `${target.name}'s armor is brittle and it takes 25% more damage for ${effect.duration} turns.`;
      }
      if (effect.type === 'charge') {
        player.chargeMultiplier = effect.multiplier;
        return `${player.name} charges their next successful attack.`;
      }
      if (effect.type === 'berserk') {
        const healthLoss = Math.min(
          Math.max(0, player.health - 1),
          Math.floor(player.maxHealth * effect.healthPercent)
        );
        player.takeDamage(healthLoss);
        player.recoverMp(Math.floor(player.maxMp * effect.mpPercent));
        player.addStatus('berserk', effect.duration + 1);
        return `${player.name} enters a berserk state, loses ${healthLoss} HP, `
          + `and restores MP.`;
      }
      if (effect.type === 'channelAether') {
        player.addStatus('channelAether', effect.duration + 1);
        return `${player.name} channels aether for ${effect.duration} turns.`;
      }
      if (effect.type === 'noHoldsBarred') {
        player.maxHealth = Math.max(1, player.maxHealth - 1);
        player.health = Math.min(player.health, player.maxHealth);
        player.damageBuff = 0;
        const result = player.attackWithResult(target, 0, effect.powerBonus, 'normal');
        return RPG.formatAttackResult(player, target, result)
          .replace(`${player.name} attacks`, `${this.name} attacks`)
          + ` Max HP permanently reduced by 1.`;
      }
      if (effect.type === 'magicBurst') {
        const spentMp = player.mp;
        player.mp = 0;
        const result = player.attackWithResult(
          target, 0, spentMp * effect.powerPerMp, 'normal'
        );
        if (result.hit && spentMp > 20) target.applyParalysis(effect.stunDuration);
        return RPG.formatAttackResult(player, target, result)
          .replace(`${player.name} attacks`, `${this.name} attacks`)
          + (result.hit && spentMp > 20 ? ' The enemy is stunned.' : '');
      }
      if (effect.type === 'execute') {
        player.damageBuff = 0;
        const result = damage();
        if (!result.hit) return `${this.name} misses.`;
        if (Math.random() <= effect.chance) {
          target.takeDamage(target.health);
          return `${this.name} instantly defeats ${target.name}!`;
        }
        return RPG.formatAttackResult(player, target, result)
          .replace(`${player.name} attacks`, `${this.name} attacks`);
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
