const expect = require('chai').expect;
const {Database} = require('../mongo');
const {db, sleep} = require('../utils/test');

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

	it('Should be able to add an event before connecting', done => {
		let database = db();

		database.on('close', () => {
			// do something
		});

		expect(database.__events).to.have.lengthOf(1);

		database.connect().then(() => {
			expect(database.__client.listeners('close')).to.have.lengthOf(2);
			expect(database).to.not.have.property('__events');
			done();

		}).catch(e => {
			done(e);
		});
	});

	it('Should be able to add an event after connecting', done => {
		let database = db();

		database.connect().then(() => {
			database.on('close', () => {
				// do something
			});

			expect(database).to.not.have.property('__events');
			expect(database.__client.listeners('close')).to.have.lengthOf(2);
			done();

		}).catch(e => {
			done(e);
		});
	});
});
