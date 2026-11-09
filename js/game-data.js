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
      description: 'A balanced fighter with strong attacks and healing.',
      health: 30,
      attack: 8,
      defense: 2,
      dexterity: 7,
      agility: 5,
      critChance: 0.1,
      passive: 'Bulwark: the first hit you take in each fight deals no damage.',
      startingItems: ['health-potion'],
      maxMp: 20,
      skills: [
        {
          name: 'Flame Strike',
          rarity: 'starter',
          mpCost: 5,
          description: 'Strike with fire for heavy damage: your attack power plus 6 before defense.',
          effect: {
            type: 'damage',
            damageType: 'fire',
            powerBonus: 6
          },
        },
        {
          name: 'Heal',
          rarity: 'starter',
          mpCost: 6,
          description: 'Restore up to 10 HP.',
          effect: {
            type: 'heal',
            amount: 10
          },
        },
      ],
    },
    {
      name: 'Archer',
      description: 'A ranged fighter who weakens enemies with status effects.',
      health: 26,
      attack: 9,
      defense: 1,
      dexterity: 10,
      agility: 8,
      critChance: 0.15,
      passive: 'Deadeye: after a few random turns, your next attack is guaranteed to hit and critically hit.',
      startingItems: ['magnifying-glass'],
      maxMp: 24,
      skills: [
        {
          name: 'Storm Arrow',
          rarity: 'starter',
          mpCost: 5,
          description: 'Deal wind damage and damage over time for 3 turns.',
          effect: {
            type: 'poison',
            damageType: 'wind',
            powerBonus: 2,
            damage: 3,
            duration: 3
          },
        },
        {
          name: 'Paralyzing Shot',
          rarity: 'starter',
          mpCost: 7,
          description: 'Deal damage and prevent the enemy from attacking next turn.',
          effect: {
            type: 'paralyze',
            damageType: 'normal',
            powerBonus: 1,
            duration: 1
          },
        },
      ],
    },
    {
      name: 'Mage',
      description: 'A spellcaster who studies enemies and commands water magic.',
      health: 22,
      attack: 7,
      defense: 1,
      dexterity: 8,
      agility: 5,
      critChance: 0.1,
      passive: 'Meditation: basic attacks restore 2 MP.',
      startingItems: ['mp-potion'],
      maxMp: 30,
      skills: [
        {
          name: 'Scan',
          rarity: 'starter',
          mpCost: 2,
          description: 'Reveal the enemy weakness and resistance.',
          effect: {
            type: 'scan'
          },
        },
        {
          name: 'Water Geyser',
          rarity: 'starter',
          mpCost: 8,
          description: 'Blast the enemy with a fairly strong water attack.',
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
      name: 'Earth Spike',
      rarity: 'common',
      mpCost: 6,
      description: 'Strike the enemy with earth damage.',
      effect: {
        type: 'damage',
        damageType: 'earth',
        powerBonus: 7
      },
    },
    {
      name: 'Drain',
      rarity: 'common',
      mpCost: 7,
      description: 'Deal normal damage and restore 50% of the damage as HP.',
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
      mpCost: 4,
      description: 'Deal weak fire damage and burn the enemy for 3 turns.',
      effect: {
        type: 'damageOverTime',
        damageType: 'fire',
        powerBonus: 1,
        damage: 2,
        duration: 3,
      },
    },
    {
      name: 'Heavy Blow',
      rarity: 'common',
      mpCost: 9,
      description: 'Deliver a strong normal-type attack.',
      effect: {
        type: 'damage',
        damageType: 'normal',
        powerBonus: 15
      },
    },
    {
      name: 'Sleep',
      rarity: 'common',
      mpCost: 8,
      description: 'High chance to put the enemy to sleep for 3 turns.',
      effect: {
        type: 'sleep',
        chance: 0.8,
        duration: 3
      },
    },
    {
      name: 'Battle Cry',
      rarity: 'common',
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
      mpCost: 10,
      description: 'Deal weak normal damage with a chance to instantly defeat the enemy.',
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
      mpCost: 5,
      description: 'The enemy deals 25% less damage for 3 turns.',
      effect: { type: 'weaken', percent: 0.25, duration: 3 },
    },
    {
      name: 'Brittle Armor',
      rarity: 'common',
      mpCost: 5,
      description: 'The enemy takes 25% more damage for 3 turns.',
      effect: { type: 'brittle', percent: 0.25, duration: 3 },
    },
    {
      name: 'Charge',
      rarity: 'common',
      mpCost: 4,
      description: 'Your next successful attack deals 1.5x damage.',
      effect: { type: 'charge', multiplier: 1.5 },
    },
    {
      name: 'Berserk',
      rarity: 'rare',
      mpCost: 8,
      description: 'Lose 5% max HP, restore 50% max MP, and gain 25% damage for 3 turns.',
      effect: {
        type: 'berserk',
        healthPercent: 0.05,
        mpPercent: 0.5,
        damagePercent: 0.25,
        duration: 3,
      },
    },
    {
      name: 'Channel Aether',
      rarity: 'rare',
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
      mpCost: 12,
      description: 'Deal extreme normal damage, permanently reducing max HP by 1.',
      effect: { type: 'noHoldsBarred', powerBonus: 40 },
    },
    {
      name: 'Magic Burst',
      rarity: 'legendary',
      mpCost: 0,
      description: 'Spend all MP on a powerful attack. Over 20 MP also stuns the enemy.',
      effect: { type: 'magicBurst', powerPerMp: 2, stunDuration: 1 },
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
    baseAgility: 5,
    agilityRandomness: 5,
    baseCritChance: 0.08,
    critChanceRandomness: 0.08,
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
    },
    {
      id: 'magnifying-glass',
      name: 'Magnifying Glass',
      description: 'Reveal the enemy weakness and resistance in combat.',
      price: 15,
      effect: {
        type: 'scan'
      },
    },
  ],
};
