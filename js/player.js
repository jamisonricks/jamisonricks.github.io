import { Inventory } from "./inventory.js";

export class Player {
  constructor(name = false) {
    this.name = name;      // Player's name
    this.hp   = 100;       // Health points
    this.lvl  = 1;         // Current Level
    this.exp  = 0;         // Current Experience
    this.expNext = 100;    // Experience needed to level up         
    this.atk  = 10;        // Attack power
    this.def  = 5;         // Defense power

    // Inventory Setup
    this.inventory = new Inventory();
    this.inventory.initializePlayer();
  }
}