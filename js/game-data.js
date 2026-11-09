window.GAME_DATA = {
  damageTypes: {
    normal: { name: 'Normal', multiplier: 1 },
    fire: { name: 'Fire', multiplier: 1.5 },
    water: { name: 'Water', multiplier: 1.5 },
    wind: { name: 'Wind', multiplier: 1.5 },
    earth: { name: 'Earth', multiplier: 1.5 },
  },
  resistanceMultiplier: 0.5,
  shop: {
    weaponUpgrade: {
      baseCost: 20,
      costIncrease: 10,
      attackIncrease: 1,
    },
    armorUpgrade: {
      baseCost: 20,
      costIncrease: 10,
      defenseIncrease: 1,
    },
  },
  classes: [
    {
      name: 'Knight',
      icon: 'o/',
      description: 'A balanced fighter with strong attacks and healing.',
      health: 30,
      attack: 8,
      defense: 2,
      dexterity: 7,
      agility: 5,
      critChance: 0.1,
      speed: 7,
      passive: 'Bulwark: the first hit you take in each fight deals no damage.',
      startingItems: ['health-potion'],
      maxMp: 20,
      skills: [
        {
          name: 'Whirling Blade',
          rarity: 'starter',
          targetType: 'allEnemies',
          mpCost: 5,
          description: 'Strike all enemies with a normal-type attack.',
          effect: {
            type: 'damage',
            damageType: 'normal',
            powerBonus: 1,
          },
        },
        {
          name: 'Heal',
          rarity: 'starter',
          targetType: 'ally',
          mpCost: 6,
          description: 'Restore 10 hp to an ally.',
          effect: {
            type: 'heal',
            amount: 10
          },
        },
      ],
    },
    {
      name: 'Archer',
      icon: 'oD',
      description: 'A ranged fighter who strengthens allies and weakens enemies.',
      health: 26,
      attack: 9,
      defense: 1,
      dexterity: 10,
      agility: 8,
      critChance: 0.15,
      speed: 10,
      passive: 'Deadeye: after a few random turns, your next attack is guaranteed to hit and critically hit.',
      startingItems: ['magnifying-glass'],
      maxMp: 24,
      skills: [
        {
          name: 'Storm Arrow',
          rarity: 'starter',
          targetType: 'enemy',
          mpCost: 5,
          description: 'Deal weak wind-type damage and deal damage over time for 3 turns.',
          effect: {
            type: 'damageOverTime',
            name: 'Wind Shear',
            damageType: 'wind',
            powerBonus: 2,
            damage: 3,
            duration: 3
          },
        },
        {
          name: 'Critical Rush',
          rarity: 'starter',
          targetType: 'allAllies',
          mpCost: 7,
          description: 'Increase all party members critical chance by 30% for 3 turns.',
          effect: {
            type: 'critBuff',
            targetGroup: 'allies',
            duration: 3,
            percent: 0.3
          },
        },
      ],
    },
    {
      name: 'Mage',
      icon: 'oT',
      description: 'A spellcaster who studies enemies and commands water magic.',
      health: 22,
      attack: 7,
      defense: 1,
      dexterity: 8,
      agility: 5,
      critChance: 0.1,
      speed: 8,
      passive: 'Meditation: basic attacks restore 2 MP.',
      startingItems: ['mp-potion'],
      maxMp: 30,
      skills: [
        {
          name: 'Scan',
          rarity: 'starter',
          targetType: 'enemy',
          mpCost: 2,
          description: 'Reveal the enemy weakness and resistance.',
          effect: {
            type: 'scan'
          },
        },
        {
          name: 'Water Geyser',
          rarity: 'starter',
          targetType: 'enemy',
          mpCost: 8,
          description: 'Blast the enemy with a strong water attack.',
          effect: {
            type: 'damage',
            damageType: 'water',
            powerBonus: 12
          },
        },
      ],
    },
  ],
  levelUpSkills: [
    {
      name: 'Conjure Flame',
      rarity: 'common',
      targetType: 'enemy',
      mpCost: 5,
      description: 'Throw a ball of fire, dealing medium fire-type damage.',
      effect: {
        type: 'damage',
        damageType: 'fire',
        powerBonus: 6
      },
    },
    {
      name: 'Boulder Throw',
      rarity: 'common',
      targetType: 'enemy',
      mpCost: 6,
      description: 'Conjure and throw a boulder, dealing medium earth-type damage.',
      effect: {
        type: 'damage',
        damageType: 'earth',
        powerBonus: 7
      },
    },
    {
      name: 'Drain',
      rarity: 'common',
      targetType: 'enemy',
      mpCost: 7,
      description: 'Deal weak normal-type damage to the enemy and restore 50% of the damage dealt as HP.',
      effect: {
        type: 'lifeSteal',
        damageType: 'normal',
        powerBonus: 3,
        healPercent: 0.5
      },
    },
    {
      name: 'Ember Dart',
      rarity: 'common',
      targetType: 'enemy',
      mpCost: 4,
      description: 'Scorch the enemy, dealing weak fire-type damage applying a burn for 3 turns.',
      effect: {
        type: 'damageOverTime',
        name: 'Burn',
        damageType: 'fire',
        powerBonus: 1,
        damage: 2,
        duration: 3,
      },
    },
    {
      name: 'Heavy Blow',
      rarity: 'common',
      targetType: 'enemy',
      mpCost: 9,
      description: 'Strike the enemy with a powerful attack, dealing heavy normal-type damage.',
      effect: {
        type: 'damage',
        damageType: 'normal',
        powerBonus: 15
      },
    },
    {
      name: 'Sleep',
      rarity: 'common',
      targetType: 'enemy',
      mpCost: 8,
      description: 'Sing a lullaby for an 80% chance to put the enemy asleep for 3 turns.',
      effect: {
        type: 'sleep',
        chance: 0.8,
        duration: 3
      },
    },
    {
      name: 'Battle Cry',
      rarity: 'common',
      targetType: 'self',
      mpCost: 6,
      description: 'Increase attack by 25% for the current fight.',
      effect: {
        type: 'attackBuff',
        percent: 0.25
      },
    },
    {
      name: 'Stone Skin',
      rarity: 'common',
      targetType: 'self',
      mpCost: 6,
      description: 'Increase defense by 25% for the current fight.',
      effect: {
        type: 'defenseBuff',
        percent: 0.25
      },
    },
    {
      name: 'Execute',
      rarity: 'common',
      targetType: 'enemy',
      mpCost: 10,
      description: 'Deal weak normal-type damage with a 20% chance to instantly defeat the enemy.',
      effect: {
        type: 'execute',
        damageType: 'normal',
        powerBonus: 1,
        chance: 0.2,
      },
    },
    {
      name: 'Weaken',
      rarity: 'common',
      targetType: 'enemy',
      mpCost: 5,
      description: 'The enemy deals 25% less damage for 3 turns.',
      effect: {
        type: 'weaken',
        percent: 0.25,
        duration: 3
      },
    },
    {
      name: 'Brittle Armor',
      rarity: 'common',
      targetType: 'enemy',
      mpCost: 5,
      description: 'The enemy takes 25% more damage for 3 turns.',
      effect: {
        type: 'brittle',
        percent: 0.25,
        duration: 3
      },
    },
    {
      name: 'Charge',
      rarity: 'common',
      targetType: 'self',
      mpCost: 4,
      description: 'Strengthen your focus, increasing your next successful attack damage by 1.5x.',
      effect: {
        type: 'charge',
        multiplier: 1.5
      },
    },
    {
      name: 'Berserk',
      rarity: 'rare',
      targetType: 'self',
      mpCost: 8,
      description: 'Lose 5% max HP, restore 50% max MP, and deal 25% increased damage for 3 turns.',
      effect: {
        type: 'berserk',
        healthPercent: 0.05,
        mpPercent: 0.5,
        damagePercent: 0.25,
        duration: 3,
      },
    },
    {
      name: 'Tidal Wave',
      rarity: 'rare',
      targetType: 'allEnemies',
      mpCost: 13,
      description: 'Summon a massive wave of water, dealing medium water-type damage to all enemies',
      effect: {
        type: 'damage',
        damageType: 'water',
        powerBonus: 8,
      }
    },
    {
      name: 'Channel Aether',
      rarity: 'rare',
      targetType: 'self',
      mpCost: 6,
      description: 'Spells cost 3 less MP and regenerate 5% max HP for 3 turns.',
      effect: {
        type: 'channelAether',
        mpReduction: 3,
        healthPercent: 0.05,
        duration: 3,
      },
    },
    {
      name: 'No Holds Barred',
      rarity: 'legendary',
      targetType: 'enemy',
      mpCost: 12,
      description: 'Deal extreme normal-type damage, permanently reducing max HP by 1.',
      effect: {
        type: 'noHoldsBarred',
        powerBonus: 40,
      },
    },
    {
      name: 'Magic Burst',
      rarity: 'legendary',
      targetType: 'enemy',
      mpCost: 0,
      description: 'Spend all MP on a powerful attack. Over 20 MP also stuns the enemy.',
      effect: {
        type: 'magicBurst',
        powerPerMp: 2,
        stunDuration: 1,
      },
    },
  ],
  encounter: {
    baseHealth: 20,
    healthPerDefeat: 4,
    healthRandomness: 7,
    baseAttack: 5,
    attackPerDefeat: 1,
    attackRandomness: 5,
    baseDefense: 1,
    defensePerDefeat: 0.5,
    defenseRandomness: 3,
    baseDexterity: 6,
    dexterityRandomness: 5,
    baseAgility: 2,
    agilityRandomness: 3,
    baseCritChance: 0.08,
    critChanceRandomness: 0.08,
    baseSpeed: 5,
    speedRandomness: 4,
    baseAttackChance: 0.45,
    attackChancePerDefeat: 0.04,
    attackChanceRandomness: 0.2,
    maxAttackChance: 0.9,
    mpReward: 3,
    xp: 100,
    goldMin: 8,
    goldMax: 16,
  },
  progression: {
    firstLevelXp: 100,
    xpIncreasePerLevel: 50,
    statGrowth: {
      health: 2,
      attack: 1,
      defense: 1,
      maxMp: 2,
    },
  },
  items: [
    {
      id: 'health-potion',
      name: 'Health Potion',
      description: 'Restore 12 HP.',
      price: 10,
      effect: {
        type: 'heal',
        amount: 12
      },
      targetType: 'ally',
    },
    {
      id: 'revival-potion',
      name: 'Revival Potion',
      description: 'Revive a fallen ally with 25% of their max HP.',
      price: 25,
      effect: {
        type: 'revive',
        healthPercent: 0.25
      },
      targetType: 'ally',
    },
    {
      id: 'mp-potion',
      name: 'MP Potion',
      description: 'Restore 8 MP.',
      price: 10,
      effect: {
        type: 'mp',
        amount: 8
      },
      targetType: 'ally',
    },
    {
      id: 'magnifying-glass',
      name: 'Magnifying Glass',
      description: 'Reveal the enemy weakness and resistance in combat.',
      price: 15,
      effect: {
        type: 'scan'
      },
      targetType: 'enemy',
    },
  ],
};
