const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

function gameLoop() {
	update();
	render();
	requestAnimationFrame(gameLoop);
}
  
function update() {
	// Update player, enemies, items, etc.
}
  
function render() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	// Draw player, enemies, items, etc.
}
  
gameLoop();