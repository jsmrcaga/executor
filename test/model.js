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

	it('Should get an object instance', done => {
		User.get({
			id: testUser.id
		}).then(users => {
			let [user] = users;
			expect(user.name).to.be.eql(testUser.name);
			expect(user.lastName).to.be.eql(testUser.lastName);
			done();

		}).catch(e => {
			done(e);
		});
	});

	it('Should find related accounts automatically', done => {
		let account = new Account();
		account.user = testUser.id;
		account.prop = testUser.id;
		account.prop2 = testUser.name;

		account.save().then(async () => {
			await sleep(10);
			return testUser.related(Account);

		}).then(accounts => {
			let [account] = accounts;
			expect(account.user).to.be.eql(testUser.id);
			expect(account.prop).to.be.eql(testUser.id);
			done();
		}).catch(e => {
			done(e);
		});
	});

	it('Should find related accounts by prop', done => {
		testUser.related(Account, 'prop').then(accounts => {
			let [account] = accounts;
			expect(account.user).to.be.eql(testUser.id);
			expect(account.prop).to.be.eql(testUser.id);
			done();

		}).catch(e => {
			done(e);
		});
	});

	it('Should find related accounts by prop and myProp', done => {
		testUser.related(Account, 'prop2', 'name').then(accounts => {
			let [account] = accounts;
			expect(account.user).to.be.eql(testUser.id);
			expect(account.prop).to.be.eql(testUser.id);
			done();

		}).catch(e => {
			done(e);
		});
	});

	it('Should find related accounts and annotate', done => {
		testUser.annotate(Account).then(user => {
			expect(user).to.have.property('account');
			expect(user.account).to.have.lengthOf(1);
			expect(user.account[0].user).to.be.eql(user.id);
			expect(user.account[0].prop).to.be.eql(user.id);
			expect(user.account[0].prop2).to.be.eql(user.name);
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

		}).then(users => {
			let [testUser] = users; 
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

	it('Should be able to find a model using Model#contains', done => {
		let u = new User();
		u.shopping = ['banana', 'mango', 'strawberry'];
		u.cars = ['Tesla', 'BMW'];

		u.save().then(() => {
			return User.contains('shopping', ['banana', 'mango', 'strawberry']);
		}).then(users => {
			let [user] = users;
			expect(user.id).to.be.eql(u.id);

			return User.contains('shopping', ['banana', 'mango']);

		}).then(users => {
			let [user] = users;
			expect(user.id).to.be.eql(u.id);

			return User.contains('cars', 'Tesla');
		}).then(users => {
			let [user] = users;
			expect(user.id).to.be.eql(u.id);

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
		}).then(([user]) => {
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
			return User.get({
				id: {
					$in: userIds
				}
			});
		};

		User.insertMany([u1, u2, u3]).then(() => {
			return getUsers();
		}).then(users => {
			expect(users.length).to.be.eql(3);

			return User.delete(u1);
		}).then(() => {
			return getUsers();
		}).then(users => {
			expect(users.length).to.be.eql(2);

			return User.delete([u2, u3]);
		}).then(() => {
			return getUsers();
		}).then(users => {
			expect(users.length).to.be.eql(0);
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
		}).then(users => {
			let [user] = users;

			expect(users.length).to.be.eql(1);
			expect(user.id).to.be.eql(u1.id);

			return user.delete();
		}).then(() => {
			return User.get({
				id: u1.id
			});
		}).then(users => {
			expect(users.length).to.be.eql(0);
			done();
		}).catch(e => {
			done(e);
		});
	});

	it('Should remove a model from database', done => {
		let u1 = new User();

		u1.save().then(() => {
			return User.get({
				id: u1.id
			});
		}).then(users => {
			expect(users.length).to.be.eql(1);

			let [user] = users;
			expect(user.id).to.be.eql(u1.id);
			expect(user.__deleted).to.be.eql(false);

			// remove from u1 to keep reference
			return u1.remove();
		}).then(() => {
			return User.get({
				id: u1.id
			});
		}).then(users => {
			expect(users.length).to.be.eql(0);

			return User.get({
				id: u1.id,
				__deleted: u1.__deleted
			});
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

	after(done => {
		database.disconnect().then(() => {
			done();
		}).catch(e => {
			done(e);
		});
	});
})
