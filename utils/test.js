const {Database} = require('../mongo');
module.exports = {
	db: () => {
		let database = new Database('test-db', {
			username: 'test-user',
			password: 'mypassword1',
			endpoint: 'ds046037.mlab.com',
			port: 46037,
			database: 'mongolian'
		});

		return database;
	},

	sleep: time => new Promise(y => setTimeout(y, time))
};
