import { Inventory } from './inventory.js';
import { Player } from './player.js';

const player = new Player();
const inventory = new Inventory(player);

// Hides and unhides the inventory
function toggleInventory() {
  const modal = document.getElementById("inventoryModal");
  modal.classList.toggle("hidden");
  displayInventoryItems();
}

// Gets the items and then displays them in a list
function displayInventoryItems() {
  const itemList = document.getElementById("inventoryList");
  itemList.innerHTML = ""; 

  inventory.getItems().forEach(item => {
    const listItem = document.createElement("li");
    listItem.textContent = item;
    itemList.appendChild(listItem);
  });
}

// Add event listeners for button click and I press
document.getElementById("inventory-close").addEventListener("click", toggleInventory);
document.addEventListener("keydown", (event) => {
  if (event.key === "i" || event.key === "I") {
    toggleInventory();
  }
});