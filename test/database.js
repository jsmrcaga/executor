const expect = require('chai').expect;
const {Database} = require('../mongo');

describe('Generic test', () => {
	it('Should create a database and connect/disconnect', done => {
		let db = new Database('test-db', {
			username: 'test-user',
			password: 'mypassword1',
			endpoint: 'ds046037.mlab.com',
			port: 46037,
			database: 'mongolian'
		});

		db.connect().then(() => {
			return db.disconnect();
		}).then(() => {
			done();
		}).catch(e => {
			done(e);
		});
	});

	it('Should create a model', () => {
		let db = new Database('test-db', {
			username: 'test-user',
			password: 'mypassword'
		});

		const User = db.model('User');

		expect(User).to.have.property('all');
		expect(User).to.have.property('get');
		expect(User).to.have.property('find');
		expect(User).to.have.property('collection');
	});
})
