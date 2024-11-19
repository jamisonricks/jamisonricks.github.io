import { Menu } from './menu.js';

// create menu instance
const game_menu = new Menu();









// use this to determine items dropped, exp gained, anything else
function post_battle(exp_gained) {
	player.exp = player.exp + exp_gained;

	while (battle_container.firstChild) {
		battle_container.removeChild(battle_container.firstChild);
	}

	// changing main button use after battle
	main_btn.hidden = false;
	main_btn.textContent = 'Continue';
	main_btn.removeEventListener('click', first_battle);
	main_btn.addEventListener('click', end_screen);
}

function end_screen() {
	text_box.innerHTML = 'Congratulations on beating the game. This game is very unfinished but I would still love to hear your thoughts on it! <br>To replay the game, simply refresh your browser.'
	main_btn.hidden = true;
}


