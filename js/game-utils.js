(function () {
  const gameData = window.GAME_DATA;

  window.RPG = window.RPG || {};
  window.RPG.getRandomInt = function (max) {
    return Math.floor(Math.random() * max);
  };

  window.RPG.shuffle = function (values) {
    const shuffled = values.slice();
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = window.RPG.getRandomInt(index + 1);
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
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
