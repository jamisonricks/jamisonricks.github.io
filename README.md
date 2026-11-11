# jamisonricks.github.io

Each combat encounter features a boss. The Precursor starts alone and calls two
reinforcements the first time its health falls to 50% or less, even if the
triggering hit defeats it. Reinforcements act starting in the next round, and
all enemies must be defeated to earn rewards. After level-ups, choose one of
three random artifacts from a chest and equip it on a party member. Members
cannot equip duplicates; chests offer fewer choices if fewer are eligible,
and can be skipped when none remain. View artifacts, use items, or visit the
shop in preparation before starting the next encounter.
The shop offers consumables, skills, and recruits.

The Precursor is always the first boss; later bosses are randomly selected
without repeating the previous boss. Boss and reinforcement stats scale with
each completed encounter. The Executioner can attack one member, attack the
whole party, or telegraph an execution for its next turn. The target must
choose Defend in that round to reduce the execution's damage from 100% to 80%
of their current HP (rounded down), regardless of turn order. Execution ignores evasion,
defense stats, shields and damage modifiers. Stun or sleep delays it, and it
fails if the target is already defeated. Run tests with `node --test tests/*.test.js`.

An enemy's attack chance determines whether it attacks on its turn and is
capped at 100% when rolled. Whether that attack hits is a separate roll:
75% plus 3 percentage points per point of attacker dexterity over the target's
agility, capped between 0% and 100%. Status bonuses apply before this
calculation; guaranteed attacks bypass the hit chance. Blind reduces dexterity
by 10 points for 3 turns, after percentage-based dexterity modifiers.

Artifacts persist between fights. Smoke Bomb adds 20 agility, Band of Life
regenerates 5% max HP at the end of each living member's combat turn, and
Ancient Tome adds 10 maximum MP. Mana Condenser increases multi-target attack
damage by 20% for each living enemy below five, counted when the action begins.
Firestarter gives each successful attack against a living enemy a 20% chance
to apply a one-turn Burn; this is tracked separately from other Burn sources.

Knight's Bulwark reduces the first successful attack each fight by 80%, but
not damage over time or the Executioner's execution. Taunt costs 3 MP and
grants 2 hate and 25% defense for 3 turns. Single-target enemy attacks and
execution target selection are weighted by hate: everyone starts at 1 hate,
so a taunting Knight has a 3:1 targeting weight against each other member.
Already-telegraphed executions do not change targets. Archer's Detect costs
2 MP and reduces an enemy's agility by 10 for 3 turns. Mage's Geo Catastrophe
costs 11 MP and attacks all enemies with earth damage; each successful hit
has a 30% chance to inflict Tremor, increasing damage taken by 25% for 3 turns.
Tremor and Brittle Armor multiply together.