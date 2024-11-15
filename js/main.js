let start_btn = document.getElementById('game-button-1');

start_btn.addEventListener('click', function startGame() {
	let text_box = document.getElementById('game-text-box')

	text_box.children[0].innerHTML = 'I have changed!';
});

