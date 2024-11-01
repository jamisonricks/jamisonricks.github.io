import { Player } from './player.js';

const player = new Player();

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

  for (let item in  player.inventory.items) {
    const listItem = document.createElement("li");
    listItem.textContent = `${item}: ${player.inventory.items[item]}`;
    itemList.appendChild(listItem);
  };
}

// Add event listeners for button click and I press
document.getElementById("inventory-close").addEventListener("click", toggleInventory);
document.addEventListener("keydown", (event) => {
  if (event.key === "i" || event.key === "I") {
    toggleInventory();
  }
});