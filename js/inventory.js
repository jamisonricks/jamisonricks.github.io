export class Inventory {
  constructor() {
    this.items = [];
  }

  initializePlayer() {
    this.items = {
      gold: 10,
      potions: 3,
    }
  }

  addItem(item) {
    this.items.push(item);
  }

  removeItem(item) {
    const index = this.items.indexOf(item);
    if (index > -1) this.items.splice(index, 1);
  }

  getItems() {
    return this.items;
  }
}