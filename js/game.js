import { asciiArt } from './asciiArt.js';
import { toggleInventory } from './inventoryModal.js';

// Initial gameState object setup
let gameState = {
  eventText: "Welcome to the game! Make a choice.",
  asciiArtKey: "startScene",
  choices: [
    { label: "Explore", action: explore },
    { label: "Rest", action: rest }
  ]
};

// Function to render the game state
function renderGame() {
  // change ascii box and event text
  document.getElementById("asciiBox").textContent = asciiArt[gameState.asciiArtKey];
  document.getElementById("eventText").textContent = gameState.eventText;

  // Update buttons
  const buttonsContainer = document.getElementById("decisionButtons");
  buttonsContainer.innerHTML = ""; // Clear existing buttons
  gameState.choices.forEach(choice => {
    const button = document.createElement("button");
    button.textContent = choice.label;
    button.addEventListener("click", choice.action);
    buttonsContainer.appendChild(button);
  });
}

function explore() {
  gameState.eventText = "You venture deeper into the forest.";
  gameState.asciiArtKey = "forestScene";
  gameState.choices = [
    { label: "Fight", action: fight },
    { label: "Open Inventory", action: openInventory},
    { label: "Flee", action: flee }
  ];
  renderGame();
}

function openInventory() {
  toggleInventory();
}

function rest() {
  gameState.eventText = "You take a moment to rest. Health restored!";
  gameState.asciiArtKey = "restScene";
  gameState.choices = [
    { label: "Continue", action: explore },
    { label: "Sleep", action: sleep }
  ];
  renderGame();
}

function fight() {
  gameState.eventText = "A wild creature appears!";
  gameState.asciiArtKey = "battleScene";
  gameState.choices = [
    { label: "Attack", action: attack },
    { label: "Skill", action: skill },
    { label: "Item", action: item },
    { label: "Run", action: flee }
  ];
  renderGame();
}

function flee() {
  gameState.eventText = "You escaped safely.";
  gameState.asciiArtKey = "safeZone";
  gameState.choices = [
    { label: "Rest", action: rest },
    { label: "Explore", action: explore }
  ];
  renderGame();
}

// Game start function call
renderGame();