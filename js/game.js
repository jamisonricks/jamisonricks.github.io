// Set up the canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

// Game Variables
const tileSize = 32;
const tileMap = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 1, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

// Player Object
const player = {
  x: tileSize,        // Starting position (in pixels)
  y: tileSize,
  health: 100,
  speed: 3,
  width: tileSize - 4,  // Small gap to fit within tiles
  height: tileSize - 4,
  color: 'blue',
  
  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  },

  move(dx, dy) {
    // Calculate new position
    const newX = this.x + dx * this.speed;
    const newY = this.y + dy * this.speed;
    const tileX = Math.floor(newX / tileSize);
    const tileY = Math.floor(newY / tileSize);

    // Check for collision with walls (tile type 1)
    if (tileMap[tileY] && tileMap[tileY][tileX] === 0) {
      this.x = newX;
      this.y = newY;
    }
  }
};

// Input Handling
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key] = true; });
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

// Game Loop
function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

// Update Game State
function update() {
  if (keys['ArrowUp']) player.move(0, -1);
  if (keys['ArrowDown']) player.move(0, 1);
  if (keys['ArrowLeft']) player.move(-1, 0);
  if (keys['ArrowRight']) player.move(1, 0);
}

// Render the Game
function render() {
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Render the map
  for (let row = 0; row < tileMap.length; row++) {
    for (let col = 0; col < tileMap[row].length; col++) {
      if (tileMap[row][col] === 1) {
        ctx.fillStyle = 'gray';
        ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
      }
    }
  }

  // Render the player
  player.draw();
}

// Start the game loop
gameLoop();