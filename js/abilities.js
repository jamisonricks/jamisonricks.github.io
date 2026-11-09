(function () {
  const RPG = window.RPG;

  class Skill {
    constructor(definition) {
      this.name = definition.name;
      this.rarity = definition.rarity || 'common';
      this.mpCost = definition.mpCost;
      this.description = definition.description;
      this.effect = definition.effect;
      this.targetMode = definition.targetMode || this.effect.targetMode || 'single';
    }

    getDescription(player, target) {
      const effect = this.effect;
      if (!['damage', 'damageOverTime', 'lifeSteal', 'execute']
        .includes(effect.type)) return this.description;
      const baseDamage = Math.max(0, player.getAttackPower() + (effect.powerBonus || 0)
        + player.damageBuff - target.getDefense());
      const result = target.getDamageResult(baseDamage, effect.damageType, false);
      const damageOverTime = effect.type === 'damageOverTime'
        ? ` + ${effect.damage} damage over ${effect.duration} turns` : '';
      return `${this.description} Damage: ${result.damage}${damageOverTime}.`;
    }

    use(player, target) {
      if (Array.isArray(target)) {
        if (this.effect.type === 'critBuff') {
          target.forEach(function (recipient) {
            recipient.addStatus('criticalRush', this.effect.duration + 1);
          }, this);
          return `${player.name} raised the parties critical chance by `
            + `${this.effect.percent * 100}%.`;
        }
        return target.map(function (singleTarget) {
          return this.use(player, singleTarget);
        }, this).join(' ');
      }
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
        return formatSkillAttack(player, this.name, target, result);
      }
      if (effect.type === 'heal') {
        const recipient = target || player;
        return `${player.name} used ${this.name} on ${recipient.name}. `
          + `${recipient.name} recovered ${recipient.heal(effect.amount)} health.`;
      }
      if (effect.type === 'damageOverTime') {
        player.damageBuff = 0;
        const result = damage();
        if (!result.hit) return `${this.name} misses and fails to apply damage over time to ${target.name}.`;
        target.applyDamageOverTime(effect.damage, effect.duration, effect.damageType);
        return formatSkillAttack(player, this.name, target, result)
          + (result.hit ? ` ${target.name} is affected by damage over time.` : '');
      }
      if (effect.type === 'scan') {
        return `${player.name} used ${this.name}. ${RPG.describeEnemy(target)}`;
      }
      if (effect.type === 'lifeSteal') {
        player.damageBuff = 0;
        const result = damage();
        const healed = player.heal(Math.floor(result.damage * effect.healPercent));
        if (!result.hit) return formatSkillAttack(player, this.name, target, result);
        return `${formatSkillAttack(player, this.name, target, result)} `
          + `${player.name} recovered ${healed} health.`;
      }
      if (effect.type === 'sleep') {
        if (Math.random() <= effect.chance) {
          target.applySleep(effect.duration);
          return `${player.name} used ${this.name} on ${target.name}. `
            + `${target.name} fell asleep for ${effect.duration} turns.`;
        }
        return `${player.name} used ${this.name} on ${target.name}. `
          + `${target.name} resisted sleep.`;
      }
      if (effect.type === 'attackBuff') {
        const recipient = target || player;
        recipient.attackBuff += effect.percent;
        return `${player.name} used ${this.name} on ${recipient.name}. `
          + `${recipient.name}'s attack rose by ${effect.percent * 100}%.`;
      }
      if (effect.type === 'defenseBuff') {
        const recipient = target || player;
        recipient.defenseBuff += effect.percent;
        return `${player.name} used ${this.name} on ${recipient.name}. `
          + `${recipient.name}'s defense rose by ${effect.percent * 100}%.`;
      }
      if (effect.type === 'weaken') {
        target.addStatus('weaken', effect.duration);
        return `${player.name} used ${this.name} on ${target.name}. `
          + `${target.name} is weakened and deals 25% less damage for ${effect.duration} turns.`;
      }
      if (effect.type === 'brittle') {
        target.addStatus('brittle', effect.duration);
        return `${player.name} used ${this.name} on ${target.name}. `
          + `${target.name}'s armor is brittle and it takes 25% more damage for ${effect.duration} turns.`;
      }
      if (effect.type === 'charge') {
        player.chargeMultiplier = effect.multiplier;
        return `${player.name} used ${this.name}. `
          + `${player.name} charges their next successful attack.`;
      }
      if (effect.type === 'berserk') {
        const healthLoss = Math.min(
          Math.max(0, player.health - 1),
          Math.floor(player.maxHealth * effect.healthPercent)
        );
        player.takeDamage(healthLoss);
        player.recoverMp(Math.floor(player.maxMp * effect.mpPercent));
        player.addStatus('berserk', effect.duration + 1);
        return `${player.name} used ${this.name}. ${player.name} enters a berserk state, loses ${healthLoss} HP, `
          + `and restores MP.`;
      }
      if (effect.type === 'channelAether') {
        player.addStatus('channelAether', effect.duration + 1);
        return `${player.name} used ${this.name}. `
          + `${player.name} channels aether for ${effect.duration} turns.`;
      }
      if (effect.type === 'noHoldsBarred') {
        player.maxHealth = Math.max(1, player.maxHealth - 1);
        player.health = Math.min(player.health, player.maxHealth);
        player.damageBuff = 0;
        const result = player.attackWithResult(target, 0, effect.powerBonus, 'normal');
        return formatSkillAttack(player, this.name, target, result)
          + ` Max HP permanently reduced by 1.`;
      }
      if (effect.type === 'magicBurst') {
        const spentMp = player.mp;
        player.mp = 0;
        const result = player.attackWithResult(
          target, 0, spentMp * effect.powerPerMp, 'normal'
        );
        if (result.hit && spentMp > 20) target.applyStun(effect.stunDuration);
        return formatSkillAttack(player, this.name, target, result)
          + (result.hit && spentMp > 20 ? ' The enemy is stunned.' : '');
      }
      if (effect.type === 'critBuff') {
        const recipient = target || player;
        recipient.addStatus('criticalRush', effect.duration + 1);
        return `${player.name} raised the parties critical chance by ${effect.percent * 100}%.`;
      }
      if (effect.type === 'execute') {
        player.damageBuff = 0;
        const result = damage();
        if (!result.hit) return formatSkillAttack(player, this.name, target, result);
        if (Math.random() <= effect.chance) {
          target.takeDamage(target.health);
          return `${player.name} used ${this.name} on ${target.name}. `
            + `${target.name} was instantly defeated!`;
        }
        return formatSkillAttack(player, this.name, target, result);
      }

      function formatSkillAttack(player, skillName, target, result) {
        if (!result.hit) {
          return `${player.name} used ${skillName} on ${target.name}. `
            + `${target.name} dodged the attack.`;
        }
        if (result.prevented) {
          return `${player.name} used ${skillName} on ${target.name}. `
            + `${target.name}'s passive blocked the hit completely.`;
        }
        const criticalText = result.critical ? ' Critical hit!' : '';
        return `${player.name} used ${skillName} on ${target.name}. `
          + `${target.name} took ${result.damage} damage`
          + RPG.formatEffectiveness(result.effectiveness) + `.${criticalText}`;
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
