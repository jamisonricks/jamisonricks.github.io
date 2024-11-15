import { Player } from './player.js';
import { Enemy } from './enemy.js';

// set up player and 1 enemy for now
const player = new Player;
const slime = new Enemy(10, 1);

// Get all variables for elements we will manipulate for the game
const text_box = document.getElementById('game-text');
const battle_container = document.getElementById('battle-buttons');
const main_btn = document.getElementById('game-button-1');
main_btn.addEventListener('click', start_game);

function start_game() {
	text_box.innerHTML = 'You begin your journey in the clearing of a small forest. Suddenly you are attacked by a slime!!';
	this.textContent = 'Begin Fight!';

	main_btn.removeEventListener('click', start_game);
	main_btn.addEventListener('click', first_battle);
}

function first_battle() {
	text_box.innerHTML = 'You have engaged the slime.';
	main_btn.hidden = true;

	// Do damage button
	const fight_btn = document.createElement('button');
	fight_btn.textContent = 'Fight'
	fight_btn.addEventListener('click', () => {
		calculate_damage(slime);
	});
	battle_container.appendChild(fight_btn);

	// @todo add other battle commands

	// Flee battle button 
	const flee_btn = document.createElement('button');
	flee_btn.textContent = 'Flee'
	flee_btn.addEventListener('click', flee_battle);
	battle_container.appendChild(flee_btn);
}

function calculate_damage(enemy) {
	enemy.hp = enemy.hp - player.atk
	player.hp = player.hp - enemy.atk

	battle_turn('fight');
}

function flee_battle() {
	// @todo Add randomness to fleeing

	text_box.innerHTML = 'You were able to flee the battle successfully!';
}

function battle_turn(choice) {
	if (choice == 'fight') {
		text_box.innerHTML = 'You hit the slime for ' + player.atk + ' damage! It has ' + slime.hp + ' hp left. <br>The slime hit you for ' + slime.atk + ' damage! You have ' + player.hp + ' hp left.'
	}

	// check to see if either died
	if (player.hp <= 0) {
		text_box.innerHTML = 'You have died! Click the button below to restart.';
	} else if (slime.hp <= 0) {
		text_box.innerHTML = 'You have defeated the enemy!';
		post_battle(slime.exp_given);
	}
}

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
}


