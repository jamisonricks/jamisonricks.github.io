(function () {
  const gameData = window.GAME_DATA;

  window.RPG = window.RPG || {};
  window.RPG.getRandomInt = function (max) {
    return Math.floor(Math.random() * max);
  };

  window.RPG.chooseEnemyTarget = function (party) {
    const candidates = party.filter(function (member) { return member.isAlive(); });
    if (!candidates.length) return null;
    const total = candidates.reduce(function (sum, member) { return sum + member.getHate(); }, 0);
    let roll = Math.random() * total;
    for (const member of candidates) {
      roll -= member.getHate();
      if (roll < 0) return member;
    }
    throw new Error('Unable to select an enemy target.');
  };

  window.RPG.formatEffectiveness = function (effectiveness) {
    if (effectiveness === 'weak') {
      return ' (weakness exploited)';
    }
    if (effectiveness === 'resisted') {
      return ' (resisted)';
    }
    if (effectiveness === 'sleep') {
      return ' (wakes the enemy for 20% bonus damage)';
    }
    return '';
  };

  window.RPG.formatAttackResult = function (attacker, target, result) {
    if (!result.hit) {
      return `${attacker.name} attacks ${target.name}, but misses.`;
    }
    if (result.prevented) {
      return `${target.name}'s passive blocks the hit completely.`;
    }
    const criticalText = result.critical ? ' Critical hit!' : '';
    return `${attacker.name} attacks ${target.name} for ${result.damage} damage`
      + window.RPG.formatEffectiveness(result.effectiveness) + `.${criticalText}`
      + (result.bulwark ? ' Bulwark reduced the damage by 80%.' : '')
      + (result.firestarterBurn ? ` ${target.name} is afflicted with Burn (1 turn).` : '');
  };

  window.RPG.describeEnemy = function (target) {
    const weaknessNames = target.weaknesses.map(function (damageType) {
      return gameData.damageTypes[damageType].name;
    });
    const resistanceText = target.resistance
      ? gameData.damageTypes[target.resistance].name
      : 'None';
    return `Scan: ${target.name} is weak to ${weaknessNames.join(', ')} and resistant to `
      + `${resistanceText}.`;
  };
})();
