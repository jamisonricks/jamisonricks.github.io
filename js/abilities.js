(function () {
  const RPG = window.RPG;
  const gameData = window.GAME_DATA;

  RPG.applyEffect = function (actor, target, effect, sourceName) {
    const targets = Array.isArray(target) ? target : [target];
    const messages = [];
    targets.forEach(function (recipient) {
      if (!recipient) return;
      if (effect.type === 'heal') {
        messages.push(`${actor.name} used ${sourceName} on ${recipient.name}. `
          + `${recipient.name} recovered ${recipient.heal(effect.amount)} health.`);
      } else if (effect.type === 'mp') {
        recipient.recoverMp(effect.amount);
        messages.push(`${actor.name} used ${sourceName} on ${recipient.name}. `
          + `${recipient.name} recovered ${effect.amount} MP.`);
      } else if (effect.type === 'revive' && !recipient.isAlive()) {
        recipient.health = Math.max(1, Math.floor(recipient.maxHealth * effect.healthPercent));
        messages.push(`${actor.name} used ${sourceName} on ${recipient.name}. `
          + `${recipient.name} was revived.`);
      } else if (effect.type === 'damage') {
        const result = actor.attackWithResult(
          recipient, 0, effect.powerBonus || 0, effect.damageType || 'normal'
        );
        messages.push(formatGenericDamage(actor, sourceName, recipient, result));
      } else if (effect.type === 'scan') {
        messages.push(`${actor.name} used ${sourceName}. ${RPG.describeEnemy(recipient)}`);
      }
    });
    return { success: messages.length > 0, message: messages.join(' ') };
  };

  function formatGenericDamage(actor, sourceName, target, result) {
    if (!result.hit) return `${actor.name} used ${sourceName} on ${target.name}. `
      + `${target.name} dodged the attack.`;
    return `${actor.name} used ${sourceName} on ${target.name}. `
      + `${target.name} took ${result.damage} damage.`;
  }

  function formatSkillAttack(player, skillName, target, result) {
    if (!result.hit) {
      return `${player.name} used ${skillName} on ${target.name}. `
        + `${target.name} dodged the attack.`;
    }
    if (result.prevented) {
      return `${player.name} used ${skillName} on ${target.name}. `
        + `${target.name} blocked the hit completely.`;
    }
    const criticalText = result.critical ? ' Critical hit!' : '';
    return `${player.name} used ${skillName} on ${target.name}. `
      + `${target.name} took ${result.damage} damage`
      + RPG.formatEffectiveness(result.effectiveness) + `.${criticalText}`;
  }

  const additionalEffectTypes = [
    'applyStatusEffect', 'damage', 'execute', 'lifeSteal', 'maxHealthReduction',
  ];
  const primarySkillEffectTypes = [
    'applyStatusEffect', 'berserk', 'damage', 'heal', 'mp', 'revive', 'scan',
  ];

  class Skill {
    constructor(definition) {
      if (!['Damage', 'Buff', 'Debuff'].includes(definition.category)) {
        throw new TypeError(`Invalid skill category for ${definition.name}.`);
      }
      if (!definition.effect || !primarySkillEffectTypes.includes(definition.effect.type)) {
        throw new TypeError(`Invalid primary effect for ${definition.name}.`);
      }
      if (definition.additionalEffects !== undefined
        && !Array.isArray(definition.additionalEffects)) {
        throw new TypeError(`Additional effects for ${definition.name} must be an array.`);
      }
      (definition.additionalEffects || []).forEach(function (effect, index) {
        if (!effect || !additionalEffectTypes.includes(effect.type)) {
          throw new TypeError(`Additional effect ${index + 1} for ${definition.name} is invalid.`);
        }
        if (effect.type === 'applyStatusEffect'
          && !gameData.statusEffects[effect.effectId]) {
          throw new TypeError(`Unknown status effect ${effect.effectId} for ${definition.name}.`);
        }
      });
      if (definition.effect.type === 'applyStatusEffect'
        && !gameData.statusEffects[definition.effect.effectId]) {
        throw new TypeError(`Unknown status effect ${definition.effect.effectId} for ${definition.name}.`);
      }
      if (definition.effect.type === 'berserk'
        && !gameData.statusEffects[definition.effect.effectId]) {
        throw new TypeError(`Unknown status effect ${definition.effect.effectId} for ${definition.name}.`);
      }
      this.name = definition.name;
      this.rarity = definition.rarity || 'common';
      this.category = definition.category;
      this.mpCost = definition.mpCost;
      this.description = definition.description;
      this.effect = definition.effect;
      this.additionalEffects = (definition.additionalEffects || []).slice();
      this.targetType = definition.targetType || 'single';
      this.targetGroup = definition.targetGroup;
    }

    getDescription(player, target) {
      const effect = this.effect;
      if (!['damage', 'damageOverTime', 'lifeSteal', 'execute']
        .includes(effect.type) || effect.powerPerMp !== undefined) return this.description;
      const baseDamage = Math.max(0, player.getAttackPower() + (effect.powerBonus || 0)
        + (effect.useDamageBuff === false ? 0 : player.damageBuff) - target.getDefense());
      const result = target.getDamageResult(baseDamage, effect.damageType || 'normal', false);
      const damageOverTimeEffect = this.additionalEffects
        .map(function (additionalEffect) {
          return additionalEffect.type === 'applyStatusEffect'
            ? gameData.statusEffects[additionalEffect.effectId]
            : null;
        })
        .find(function (statusEffect) {
          return statusEffect && statusEffect.category === 'damageOverTime';
        });
      const damageOverTime = damageOverTimeEffect
        ? ` + ${damageOverTimeEffect.damage} damage over ${damageOverTimeEffect.duration} turns`
        : '';
      return `${this.description} Damage: ${result.damage}${damageOverTime}.`;
    }

    use(player, target) {
      const isMultiTarget = this.targetType === 'multiTarget';
      if (Array.isArray(target) && isMultiTarget) {
        if (this.effect.type === 'applyStatusEffect'
          && this.effect.effectId === 'criticalChanceIncrease'
          && !this.additionalEffects.length) {
          target.forEach(function (recipient) {
            recipient.applyStatusEffect(this.effect.effectId, this.name, {
              durationOffset: this.effect.durationOffset,
            });
          }, this);
          return `${player.name} used ${this.name} on all allies. `
            + `${player.name} raised the parties critical chance by `
            + `${gameData.statusEffects[this.effect.effectId].percent * 100}%.`;
        }
        const groupName = this.targetGroup === 'ally' ? 'all allies' : 'all enemies';
        const header = `${player.name} used ${this.name} on ${groupName}.`;
        const details = target.map(function (singleTarget) {
          return this.use(player, singleTarget)
            .replace(`${player.name} used ${this.name} on ${singleTarget.name}. `, '');
        }, this);
        return `${header} ${details.join(' ')}`;
      }
      if (Array.isArray(target)) target = target[0];
      const context = {};
      const messages = [this.applyPrimaryEffect(player, target, context)];
      this.additionalEffects.forEach(function (effect) {
        const message = this.applyAdditionalEffect(player, target, effect, context);
        if (message) messages.push(message);
      }, this);
      if (context.executed) {
        messages[0] = `${player.name} used ${this.name} on ${target.name}. `
          + `${target.name} was instantly defeated!`;
      }
      return messages.filter(Boolean).join(' ');
    }

    applyStatusEffect(player, target, effect, includeSkillUsage = true) {
      const recipient = target || player;
      const definition = gameData.statusEffects[effect.effectId];
      const applied = recipient.applyStatusEffect(effect.effectId, this.name, {
        durationOffset: effect.durationOffset,
      });
      const usage = includeSkillUsage
        ? `${player.name} used ${this.name} on ${recipient.name}. ` : '';
      if (!applied) {
        return `${usage}${recipient.name} resisted ${definition.name.toLowerCase()}.`;
      }
      if (definition.category === 'damageOverTime') {
        return `${usage}${recipient.name} is afflicted with ${definition.name}.`;
      }
      return `${usage}${definition.description}`;
    }

    applyPrimaryEffect(player, target, context) {
      const effect = this.effect;
      const damageBonus = player.damageBuff;
      const damage = function () {
        const spentMp = effect.consumeMp ? player.mp : 0;
        if (effect.consumeMp) player.mp = 0;
        if (effect.clearDamageBuff) player.damageBuff = 0;
        const effectDamageBonus = effect.powerPerMp === undefined
          ? 0 : spentMp * effect.powerPerMp;
        const guaranteed = effect.useGuaranteedAttack === false
          ? false : player.consumeGuaranteedAttack();
        const result = player.attackWithResult(
          target,
          0,
          (effect.powerBonus || 0)
            + (effect.useDamageBuff === false ? 0 : damageBonus)
            + effectDamageBonus,
          effect.damageType || 'normal',
          guaranteed
        );
        context.result = result;
        if (effect.consumeMp) context.spentMp = spentMp;
        return result;
      };
      if (effect.type === 'damage') {
        if (effect.clearDamageBuff !== false) player.damageBuff = 0;
        const result = damage();
        if (effect.clearDamageBuff) player.damageBuff = 0;
        return formatSkillAttack(player, this.name, target, result);
      }
      if (['heal', 'revive', 'mp'].includes(effect.type)) {
        return RPG.applyEffect(player, target || player, effect, this.name).message;
      }
      if (effect.type === 'scan') {
        return `${player.name} used ${this.name}. ${RPG.describeEnemy(target)}`;
      }
      if (effect.type === 'lifeSteal') {
        player.damageBuff = 0;
        const result = damage();
        context.result = result;
        const healed = player.heal(Math.floor(result.damage * effect.healPercent));
        if (!result.hit) return formatSkillAttack(player, this.name, target, result);
        return `${formatSkillAttack(player, this.name, target, result)} `
          + `${player.name} recovered ${healed} health.`;
      }
      if (effect.type === 'applyStatusEffect') {
        return this.applyStatusEffect(player, target, effect);
      }
      if (effect.type === 'berserk') {
        const healthLoss = Math.min(
          Math.max(0, player.health - 1),
          Math.floor(player.maxHealth * effect.healthPercent)
        );
        player.takeDamage(healthLoss);
        player.recoverMp(Math.floor(player.maxMp * effect.mpPercent));
        player.applyStatusEffect(effect.effectId, this.name, {
          durationOffset: effect.durationOffset,
        });
        return `${player.name} used ${this.name}. ${player.name} enters a berserk state, loses ${healthLoss} HP, `
          + `and restores MP.`;
      }
      if (effect.type === 'execute') {
        player.damageBuff = 0;
        const result = damage();
        context.result = result;
        if (!result.hit) return formatSkillAttack(player, this.name, target, result);
        if (Math.random() <= effect.chance) {
          target.takeDamage(target.health);
          return `${player.name} used ${this.name} on ${target.name}. `
            + `${target.name} was instantly defeated!`;
        }
        return formatSkillAttack(player, this.name, target, result);
      }

      return `${this.name} has no effect.`;
    }

    applyAdditionalEffect(player, target, effect, context) {
      if (effect.requiresHit && (!context.result || !context.result.hit)) return '';
      if (effect.requiresSpentMpAbove !== undefined
        && (context.spentMp === undefined
          || context.spentMp <= effect.requiresSpentMpAbove)) return '';

      if (effect.type === 'damage') {
        const damageBonus = effect.useDamageBuff === false ? 0 : player.damageBuff;
        if (effect.clearDamageBuff !== false) player.damageBuff = 0;
        const result = player.attackWithResult(
          target,
          0,
          (effect.powerBonus || 0) + damageBonus,
          effect.damageType || 'normal',
          effect.useGuaranteedAttack === false ? false : player.consumeGuaranteedAttack()
        );
        context.result = result;
        if (effect.clearDamageBuff !== false) player.damageBuff = 0;
        return formatSkillAttack(player, this.name, target, result)
          .replace(`${player.name} used ${this.name} on ${target.name}. `, '');
      }
      if (effect.type === 'lifeSteal') {
        if (!context.result || !context.result.hit) return '';
        const healed = player.heal(Math.floor(context.result.damage * effect.healPercent));
        return `${player.name} recovered ${healed} health.`;
      }
      if (effect.type === 'execute') {
        if (context.result && context.result.hit && Math.random() <= effect.chance) {
          target.takeDamage(target.health);
          context.executed = true;
        }
        return '';
      }
      if (effect.type === 'maxHealthReduction') {
        player.maxHealth = Math.max(1, player.maxHealth - effect.amount);
        player.health = Math.min(player.health, player.maxHealth);
        return `Max HP permanently reduced by ${effect.amount}.`;
      }
      if (effect.type === 'heal') {
        const recipient = target || player;
        return `${recipient.name} recovered ${recipient.heal(effect.amount)} health.`;
      }
      if (effect.type === 'revive' && target && !target.isAlive()) {
        target.health = Math.max(1, Math.floor(target.maxHealth * effect.healthPercent));
        return `${target.name} was revived.`;
      }
      if (effect.type === 'mp') {
        const recipient = target || player;
        recipient.recoverMp(effect.amount);
        return `${recipient.name} recovered ${effect.amount} MP.`;
      }
      if (effect.type === 'scan') return RPG.describeEnemy(target);
      if (effect.type === 'applyStatusEffect') {
        return this.applyStatusEffect(player, target, effect, false);
      }
      return '';
    }
  }

  class Item {
    constructor(definition) {
      Object.assign(this, definition);
      this.targetType = definition.targetType || 'self';
      this.targetGroup = definition.targetGroup;
    }

    use(actor, target) {
      return RPG.applyEffect(actor, target, this.effect, this.name);
    }
  }

  RPG.Skill = Skill;
  RPG.Item = Item;
})();
