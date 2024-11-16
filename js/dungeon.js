import { Player } from './player.js';
import { Enemy } from './enemy.js';
import { Battle } from './battle.js';

export class Dungeon {
  /**
   * Creates new Dungeon instance.
   * @param {string} name - Name of the Dungeon
   * @param {number} length - How many rooms are in the dungeon
   * @param {number} difficulty - The difficulty of the dungeon (0-1)
   */
  constructor(name, length, difficulty) {
    this.name = name;
    this.length = length;
    this.progress = 0;
    this.difficulty = difficulty;

    this.dungeon_setup();
  }

  dungeon_setup() {

  }
}