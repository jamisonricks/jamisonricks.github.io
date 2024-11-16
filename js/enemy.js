export class Enemy {
	constructor(name = 'Slime', hp, atk, exp_given = 0) {
		this.name = name
		this.hp = hp;
		this.atk = atk;
		this.exp_given = exp_given;
	}
}