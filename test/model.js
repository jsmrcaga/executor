const expect = require('chai').expect;
const {db, sleep} = require('../utils/test');
const ModelFactory = require('../lib/model');

describe('Model', () => {
	const database = db();
	
	const User = database.model('User');
	let testUser = new User();
	testUser.name = 'Test';
	testUser.lastName = 'User';

	const Account = database.model('Account');

	before(done => {
		database.connect().then(() => {
			return database.clear();
		}).then(() => {
			done();
		}).catch(e => {
			done(e);
		});
	});

	it('Should get a model Proxy', () => {
		let name = 'TestModel';
		let model = ModelFactory(database, name);
		expect(model).to.have.property('name');
		expect(model.name()).to.be.eql(name.toLowerCase());
		
		expect(model).to.have.property('all');
		expect(model).to.have.property('get');
		expect(model).to.have.property('find');
		expect(model).to.have.property('collection');

		// Mongo inherited by proxy
		expect(model.findOne).to.be.instanceOf(Function);
		expect(model.findOneAndReplace).to.be.instanceOf(Function);
		expect(model.testProp).to.be.undefined;
	});

	it('Should instanciate a model and save it', done => {
		testUser.save().then(() => {
			// wait for db to be ready
			setTimeout(done, 10);
		}).catch(e => {
			done(e);
		});
	});

	it('Should update a model with new data without saving', () => {
		let user = new User();
		user.update({
			name: 'jo',
			lastname: 'colina'
		});

		expect(user.name).to.be.eql('jo');
		expect(user.lastname).to.be.eql('colina');
	});

	it('Should update a model with new data and save', done => {
		let user = new User();
		user.update({
			name: 'jo',
			lastname: 'colina'
		}).save().then(user => {
			expect(user.name).to.be.eql('jo');
			expect(user.lastname).to.be.eql('colina');
			done();
		}).catch(e => {
			done(e);
		});

	});

	it('Should get an object instance', done => {
		User.get({
			id: testUser.id
		}).then(user => {
			expect(user.name).to.be.eql(testUser.name);
			expect(user.lastName).to.be.eql(testUser.lastName);
			done();

		}).catch(e => {
			done(e);
		});
	});

	it('Should extend a model and save and keep methods', done => {
		class MyUser extends User {
			constructor(name, lastname) {
				super();
				this.name = name;
				this.lastname = lastname;
			}

			sayHello() {
				return `Hello ${this.name}`;
			}
		}

		const test = new MyUser('TestUser', 'Some lastname');
		
		test.save().then(() => {
			return MyUser.get({id : test.id});

		}).then(testUser => {
			expect(testUser.id).to.be.eql(test.id);
			expect(testUser.name).to.be.eql('TestUser');
			expect(testUser.lastname).to.be.eql('Some lastname');
			expect(testUser.sayHello).to.be.instanceOf(Function);
			expect(testUser.sayHello()).to.be.eql('Hello TestUser');
			done();

		}).catch(e => {
			done(e);
		});
	});

	it('Should update creation date for a model', done => {
		let u = new User();
		u.name = 'Test';
		u.lastname = 'User';

		let now = Date.now();
		u.save().then(() => {
			// Allow 10 ms difference
			expect(u.__updated).to.be.within(now, now + 10);
			u.lastname = 'Test';

			now = Date.now();
			return u.save();
		}).then(() => {
			return User.get({ id: u.id });
		}).then(user => {
			expect(user.lastname).to.be.eql('Test');
			expect(user.__updated).to.be.within(now, now + 10);
			done();
		}).catch(e => {
			done(e);
		});
	});

	it('Should create and then delete models with static method', done => {
		let u1 = new User();
		let u2 = new User();
		let u3 = new User();

		let userIds = [u1, u2, u3].map(user => user.id);

		let getUsers = () => {
			return User.find({
				id: {
					$in: userIds
				}
			});
		};

		User.insertMany([u1, u2, u3]).then(() => {
			return getUsers();
		}).then(users => {
			return users.count();
		}).then(count => {
			expect(count).to.be.eql(3);

			return User.delete(u1);
		}).then(() => {
			return getUsers();
		}).then(users => {
			return users.count();
		}).then(count => {
			expect(count).to.be.eql(2);

			return User.delete([u2, u3]);
		}).then(() => {
			return getUsers();
		}).then(users => {
			return users.count();
		}).then(count => {
			expect(count).to.be.eql(0);
			done();
		}).catch(e => {
			done(e);
		});
	});

	it('Should create and delete an instance', done => {
		let u1 = new User();

		u1.save().then(() => {
			return User.get({
				id: u1.id
			});
		}).then(user => {
			expect(user.id).to.be.eql(u1.id);

			return user.delete();
		}).then(() => {
			return User.find({
				id: u1.id
			});
		}).then(users => {
			return users.count();
		}).then(count => {
			expect(count).to.be.eql(0);
			done();
		}).catch(e => {
			done(e);
		});
	});

	it('Should remove a model from database', done => {
		let u1 = new User();

		u1.save().then(() => {
			return User.filter({
				id: u1.id
			}).toArray();
		}).then(users => {
			expect(users.length).to.be.eql(1);

			let [user] = users;
			expect(user.id).to.be.eql(u1.id);
			expect(user.__deleted).to.be.eql(false);

			// remove from u1 to keep reference
			return u1.remove();
		}).then(() => {
			return User.find({
				id: u1.id
			}).toArray();
		}).then(users => {
			expect(users.length).to.be.eql(0);

			return User.filter({
				id: u1.id,
				__deleted: u1.__deleted
			}).toArray();
		}).then(users => {
			expect(users.length).to.be.eql(1);

			let [user] = users;
			expect(user.id).to.be.eql(u1.id);
			expect(user.__deleted).to.be.eql(u1.__deleted);

			done();

		}).catch(error => {
			done(error);
		});
	});

	it('Should create an index from a model', done => {
		User.createIndex({ name: 1 }).then(() => {
			return User.indexes();
		}).then(indexes => {
			let index = indexes.find(index => index.key['name'] !== undefined);
			expect(index).to.not.be.undefined;
			expect(index.key.name).to.be.eql(1);
			done();
		}).catch(e => done(e));
	});

	it('Should create multiple indexes from a model, one by one', done => {
		User.createIndexes([{key: { lastname: 1 }}, {key: { id: -1 }}]).then(() => {
			return User.indexes();
		}).then(indexes => {
			for (let key of ['lastname', 'id']) {
				let index = indexes.find(index => index.key[key] !== undefined);
				expect(index).to.not.be.undefined;
				expect(index.key[key]).to.be.eql(key === 'lastname' ? 1 : -1);
			}

			done();
		}).catch(e => done(e));
	});

	it('Should create multiple indexes from a model, bulk', done => {
		User.createIndexes([{ key: {holder: 1 }}, { key: { account: -1 }}], { bulk: true }).then(() => {
			return User.indexes();
		}).then(indexes => {
			for (let key of ['holder', 'account']) {
				let index = indexes.find(index => index.key[key] !== undefined);
				expect(index).to.not.be.undefined;
				expect(index.key[key]).to.be.eql(key === 'holder' ? 1 : -1);
			}

			done();
		}).catch(e => done(e));
	});

	after(done => {
		database.disconnect().then(() => {
			done();
		}).catch(e => {
			done(e);
		});
	});
})
