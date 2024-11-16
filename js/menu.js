import { Dungeon } from './dungeon.js';
import { Shop } from './shop.js';
import { Inn } from './inn.js';

export class Menu {
	constructor() {
		this.text_box = document.getElementById('game-text');
		this.main_btn = document.getElementById('game-button-1');
		this.btn_2 = document.getElementById('game-button-2');
		this.btn_3 = document.getElementById('game-button-3');
		this.btn_4 = document.getElementById('game-button-4');

		// adding event listener for button to start the game
		this.main_btn.addEventListener('click', () => this.start_game());
	}

	toggle_all_btns(command) {
		let menu_btns = document.querySelectorAll('.menu-btn');

		if (command == 'hide') {
			menu_btns.forEach(btn => {
				btn.hidden = true;
			});
		} else if (command == 'unhide') {
			menu_btns.forEach(btn => {
				btn.hidden = false;
			});
		}
	}
	
	
	start_game() {
		this.text_box.innerHTML = 'You begin your journey in a small quiet town. Near you there is a shop, an inn, a sewer entrance, and an exit into a nearby forest. <br><br>Where would you like to go?';
		// unhide all btns
		this.toggle_all_btns('unhide');

		// Setup different button choices
		this.main_btn.textContent = 'Into the forest';
		this.main_btn.removeEventListener('click', () => this.start_game());
		this.main_btn.addEventListener('click', () => this.enter_forest());

		this.btn_2.textContent = 'Visit the shop'
		this.btn_2.addEventListener('click', () => this.enter_shop());
		
		this.btn_3.textContent = 'Visit the Inn'
		this.btn_3.addEventListener('click', () => this.enter_inn());

		this.btn_4.textContent = 'Enter the sewer system'
		this.btn_4.addEventListener('click', () => this.enter_sewer());
	}

	enter_forest() {
		this.toggle_all_btns('hide');

		const forest_dungeon = new Dungeon('Forest', 4, 0.1);
	}

	enter_shop() {
		this.toggle_all_btns('hide');

		const basic_shop = new Shop();
	}

	enter_inn() {
		this.toggle_all_btns('hide');

		const basic_inn = new Inn();
	}

	enter_sewer() {
		this.toggle_all_btns('hide');

		const sewer_dungeon = new Dungeon('Sewer', 6, 0.3);
	}

	// start_game() {
	// 	this.text_box.innerHTML = 'You begin your journey in the clearing of a small forest. Suddenly you are attacked by a slime!!';
	// 	this.main_btn.textContent = 'Begin Fight!';

  //   const first_battle = new Battle(this.player, this.enemy, {type: 'first'})
		
	// 	this.main_btn.removeEventListener('click', () => this.start_game());
	// 	this.main_btn.addEventListener('click', () => first_battle.battle_setup());
	// }
}