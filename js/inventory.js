export class Inventory {
  constructor(owner) {
    this.items = [];
    this.owner = owner
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