import { Player } from './player.js';
import { Enemy } from './enemy.js';
import { Battle } from './battle.js';

export class Menu {
	constructor() {
		this.text_box = document.getElementById('game-text');
		this.main_btn = document.getElementById('game-button-1');

		// adding event listener for button to start the game
		this.main_btn.addEventListener('click', () => this.start_game());

		// set up objects for manipulation throughout
		this.player = new Player();
		this.enemy = new Enemy('Slime', 10, 1);
	}
	
	
	start_game() {
		this.text_box.innerHTML = 'You begin your journey in the clearing of a small forest. Suddenly you are attacked by a slime!!';
		this.main_btn.textContent = 'Begin Fight!';

    const first_battle = new Battle(this.player, this.enemy, {type: 'first'})
		
		this.main_btn.removeEventListener('click', () => this.start_game());
		this.main_btn.addEventListener('click', () => first_battle.battle_setup());
	}
}