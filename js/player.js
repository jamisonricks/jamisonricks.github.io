export class Player {
	constructor(role) {
		// default stats
		if (!role) { 
			this.hp = 10;
			this.atk = 4;
			this.exp = 0;
		}
		
	}
}