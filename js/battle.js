import { Menu } from './menu.js';

// Battle Handler class
export class Battle {
  constructor(player, enemy, mechanics = false) {
    // setting global variables from parameters
    this.player = player;
    this.enemy = enemy;
    this.mechanics = mechanics;
    this.battle_container = document.getElementById('battle-buttons');
    this.menu = new Menu();

	}

  /**
   * Helper function to clear the battle menu for various purposes
   */
  #clear_battle_menu() {
    // clear any existing buttons
    while (this.battle_container.firstChild) {
      this.battle_container.removeChild(this.battle_container.firstChild);
    }
  }

  battle_setup() {
    // Set menu elements to be good for battling
    this.menu.text_box.innerHTML = 'You have engaged the ' + this.enemy.name + '.';
    this.menu.toggle_all_btns('hide');

    this.battle_menu();
  }

  /**
   * Function to display battle options
   */
  battle_menu() {
    // clear any battle options present
    this.#clear_battle_menu();

    // Do damage button
    const fight_btn = document.createElement('button');
    fight_btn.textContent = 'Fight';
    fight_btn.addEventListener('click', () => {
      this.player_turn('fight');
    });
    this.battle_container.appendChild(fight_btn);

    // @todo add other battle commands

    // Flee battle button 
    const flee_btn = document.createElement('button');
    flee_btn.textContent = 'Flee';
    flee_btn.addEventListener('click', () => this.flee_battle());
    this.battle_container.appendChild(flee_btn);
  }

  player_turn(choice) {
    if (choice == 'fight') {
      let dmg_result = this.calculate_damage(this.player, this.enemy);
      this.menu.text_box.innerHTML = 'You hit the ' + this.enemy.name + ' for ' + dmg_result + ' damage! It has ' + this.enemy.hp + ' hp left.<br>';

    } else {
      // @todo add something
    }
    
    // check to see if enemy died
    if (this.enemy.hp <= 0) {
      this.menu.text_box.innerHTML = 'You have defeated the ' + this.enemy.name + '!';
      this.post_battle();
    } else {
      this.enemy_turn();
    }
  }

  enemy_turn() {
    switch (this.mechanics.type) {
      case 'first':
        // @todo handle
        
        break;
      case 'midboss':
        // @todo handle

        break;
      default:
        console.log('Unexpected mechanic type :' + this.mechanics.type);
    }
    let dmg_result = this.calculate_damage(this.enemy, this.player);
    this.menu.text_box.innerHTML += 'The ' + this.enemy.name + ' hit you for ' + dmg_result + ' damage! You have ' + this.player.hp + ' hp left.';

    // check to see if player died
    if (this.player.hp <= 0) {
      this.menu.text_box.innerHTML = 'You have died! Refresh the browser to restart.';
      this.#clear_battle_menu();
    } else {
      this.battle_menu();
    }
  }

  calculate_damage(attacker, defender) {
    // @todo right now im just making attack deal 100% damage, later this will change
    let damage_taken = attacker.atk;

    // deal damage to player and enemy
    defender.hp = defender.hp - damage_taken;

    return damage_taken;
  }

  flee_battle() {
    // clear any existing battle buttons
    this.#clear_battle_menu();

    // @todo Add randomness to fleeing
  
    this.menu.text_box.innerHTML = 'You were able to flee the battle successfully!';
  }

  calculate_exp() {
    // @todo may add more advanced exp calculating and level up checking later
    this.player.exp = this.player.exp + this.enemy.exp_given;
  }

  post_battle() {
    this.#clear_battle_menu();
    this.calculate_exp();


  }


}