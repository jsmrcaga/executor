const { expect } = require('chai');

const { db } = require('../utils/test');
const Transaction = require('../lib/transaction');

describe('Transactions', () => {
	const database = db();
	const User = database.model('User');
	const Transfer = database.model('Transfer');

	before(done => {
		database.connect().then(() => {		
			let dummyTransfer = new Transfer();
			dummyTransfer.qtty = 0;
			return dummyTransfer.save();
		}).then(() => done()).catch(e => done(e));
	});

	it('Should create a simple transaction', done => {
		let transaction = database.transaction();
		expect(transaction).to.be.instanceOf(Transaction);
		transaction.abort().then(() => done()).catch(e => done(e));
	});

	it('Should return an active session from a transaction', done => {
		let transaction = database.transaction();
		expect(transaction.session.inTransaction()).to.be.eql(true);
		expect(transaction.options().session).to.be.eql(transaction.session);
		transaction.abort().then(() => done()).catch(e => done(e));
	});

	it('Should create a simple transaction with queries and abort', done => {
		let transaction = database.transaction();

		// simulate queries with transaction
		let user = new User();
		user.test = 'test1';
		user.value = 25;
		let user_save = user.save(transaction.options());

		transaction.add(user_save);

		transaction.abort().then(() => {
			return User.filter({ test: 'test1' }).toArray();
		}).then(users => {
			expect(users.length).to.be.eql(0);
			done();
		}).catch(e => done(e));
	});

	it('Should create a simple transaction with queries and commit', done => {
		let transaction = database.transaction();

		// simulate queries with transaction
		let user = new User();
		user.test = 'test2';
		user.value = 25;
		let user_save = user.save(transaction.options());
		
		transaction.add(user_save);

		transaction.commit().then(() => {
			return User.get({ test: 'test2' });
		}).then(user => {
			expect(user).to.not.be.undefined;
			done();
		}).catch(e => done(e));
	});

	it('Should create a transaction and operation but not be present if not committed', done => {
		let transaction = database.transaction();

		let user = new User();
		user.test = 'poulet-3000';
		let user_save = user.save(transaction.options());

		transaction.add(user_save);

		User.get({ test: 'poulet-3000' }).then(user => {
			expect(user).to.be.undefined;

			return transaction.abort();
		}).then(() => {
			done();
		}).catch(e => {
			done(e);
		});
	});

	it('Should create a transaction and operation but not be present if not committed, but present after committing', done => {
		let transaction = database.transaction();

		let user = new User();
		user.test = 'poulet-3000';
		let user_save = user.save(transaction.options());

		transaction.add(user_save);

		User.get({ test: 'poulet-3000' }).then(user => {
			expect(user).to.be.undefined;

			return transaction.abort();
		}).then(() => {
			done();
		}).catch(e => {
			done(e);
		});
	});

	it('Should create a simple transaction with multiple queries and commit', done => {
		let transaction = database.transaction();

		// simulate queries with transaction
		let user = new User();
		user.test = 'test3';

		let user_save = user.save(transaction.options());

		let user2 = new User();
		user2.value = 23546;

		let user_save2 = user2.save(transaction.options());

		transaction.add(user_save, user_save2);

		transaction.commit().then(() => {
			return Promise.all([User.get({ test: 'test3' }), User.get({ value: 23546 })]);
		}).then(([user1, user2]) => {
			expect(user1).not.to.be.undefined;
			expect(user1.test).to.be.eql('test3');

			expect(user2).not.to.be.undefined;
			expect(user2.value).to.be.eql(23546);

			done();
		}).catch(e => done(e));
	});

	function huge_mixin() {
		let transaction = database.transaction();

		// simulate queries with transaction
		let user = new User();
		user.name = `User1-${Math.random()}`;
		user.money = 25;

		let user_save = user.save(transaction.options());

		let user2 = new User();
		user2.name = `User2-${Math.random()}`;
		user2.money = 50;

		let user2_save = user2.save(transaction.options());	

		let transfer = new Transfer();

		transfer.from = user.id;
		transfer.to = user2.id;
		transfer.qtty = 5;
		
		let transfer_save = transfer.save(transaction.options());

		transaction.add(user_save,
						user2_save,
						transfer_save);

		return {
			user,
			user2,
			transfer,
			transaction
		};
	}

	it('Should create a simple transaction with multiple objects and queries and abort', done => {
		let { user, user2, transfer, transaction } = huge_mixin();

		transaction.abort().then(() => {
			return User.get({ name: user.name });
		}).then(user => {
			expect(user).to.be.undefined;
			return User.get({ name: user2.name });
		}).then(user => {
			expect(user).to.be.undefined;
			return Transfer.filter({ id: transfer.id }).toArray();
		}).then(transfers => {
			expect(transfers.length).to.be.eql(0);
			done();
		}).catch(e => done(e));
	});

	it('Should create a simple transaction with multiple objects and queries and commit', done => {
		let { user, user2, transfer, transaction } = huge_mixin();

		transaction.commit().then(() => {
			return User.get({ name: user.name });
		}).then(user1 => {
			expect(user1).not.to.be.undefined;
			expect(user1.name).to.be.eql(user.name);
			expect(user1.money).to.be.eql(user.money);

			return User.get({ name: user2.name });
		}).then(user21 => {
			expect(user21).not.to.be.undefined;
			expect(user21.name).to.be.eql(user2.name);
			expect(user21.money).to.be.eql(user2.money);
			
			return Transfer.find({ id: transfer.id }).toArray();
		}).then(transfers => {
			let [transfer1] = transfers;
			expect(transfers.length).to.be.eql(1);
			expect(transfer1.from).to.be.eql(user.id);
			expect(transfer1.to).to.be.eql(user2.id);
			expect(transfer1.qtty).to.be.eql(5);
			done();
		}).catch(e => done(e));
	});

	it('Should be able to perform 2 transactions simultaneously', done => {
		let tr1 = database.transaction();
		let tr2 = database.transaction();

		let u1 = new User();
		u1.name = 'u1';
		let u1_save = u1.save(tr1.options());

		let t1 =new Transfer();
		t1.qtty = 1;
		let t1_save = t1.save(tr1.options());

		let u2 = new User();
		u2.name = 'u2';
		let u2_save = u2.save(tr2.options());

		let t2 =new Transfer();
		t2.qtty = 25;
		let t2_save = t2.save(tr2.options());

		tr1.add(u1_save, t1_save);
		tr2.add(u2_save, t2_save);

		Promise.all([tr1.commit(), tr2.commit()]).then(() => {
			return User.find({
				name: {
					$in: ['u1', 'u2']
				}
			}).toArray();
		}).then(users => {
			let u1 = users.find(u => u.name === 'u1');
			let u2 = users.find(u => u.name === 'u2');

			expect(u1).to.not.be.undefined;
			expect(u2).to.not.be.undefined;

			return Transfer.find({
				qtty: {
					$in: [1, 25]
				}
			}).toArray();
		}).then(transfers => {
			let t1 = transfers.find(t => t.qtty === 1);
			let t2 = transfers.find(t => t.qtty === 25);

			expect(t1).to.not.be.undefined;
			expect(t2).to.not.be.undefined;
			done();

		}).catch(e => {
			done(e);
		});
	});

	after(done => { database.disconnect().then(() => done()).catch(e => done(e)) });
});
