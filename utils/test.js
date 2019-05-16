const {Database} = require('../mongo');
module.exports = {
	db: () => {
		const { username, password, endpoint, port, database } = require('../test/db-config.json');
		let db = new Database('test-db', {
			username,
			password,
			endpoint,
			port,
			database
		});

		return db;
	},

	sleep: time => new Promise(y => setTimeout(y, time))
};
