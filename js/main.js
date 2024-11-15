let start_btn = document.getElementById('game-button-1');

start_btn.addEventListener('click', function startGame() {
	let text_box = document.getElementById('game-text')

	text_box.innerHTML = 'I have changed!';
});

