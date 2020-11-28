const { Collection } = require('mongodb');
const { expect } = require('chai');
const Model = require('../lib/models/model');
const { PrimaryKey } = require('../lib/models/fields');
const Manager = require('../lib/models/manager');

const Database = require('../lib/database');

const fixtures = require('./fixtures');

// Test class
class MyTestModel extends Model {}
MyTestModel.VALIDATION_SCHEMA = {
	poulet: new PrimaryKey({
		defaultValue: () => Math.floor(Math.random() * 0x100000).toString(16)
	})
};

describe('Models', () => {
	const connection = fixtures.connect();

	describe('Static', () => {
		it('db - Should have a db instance', () => {
			expect(Model.db).to.be.an.instanceof(Database);
			expect(MyTestModel.db).to.be.an.instanceof(Database);
		});

		it('objects - Should return an instanciated manager', () => {
			expect(Model.objects).to.be.an.instanceof(Manager);
			expect(MyTestModel.objects).to.be.an.instanceof(Manager);
			expect(MyTestModel.objects.Model).to.be.eql(MyTestModel);
		});

		it('collection_name - Should return the collection name', () => {
			expect(Model.collection_name).to.be.eql('model');
			expect(MyTestModel.collection_name).to.be.eql('my-test-model');
		});

		it('collection - Should return the actual collection', () => {
			expect(Model.collection).to.be.an.instanceof(Collection);
			expect(MyTestModel.collection).to.be.an.instanceof(Collection);
		});

		it('pk - Gets pk', () => {
			const [generic_pk, generic_pk_field] = Model.pk;
			const [test_pk, test_pk_field] = MyTestModel.pk;

			expect(generic_pk_field).to.be.null;
			expect(test_pk_field).to.be.an.instanceof(PrimaryKey);

			expect(generic_pk).to.be.eql('_id');
			expect(test_pk).to.be.eql('poulet');
		});

		it('create - Instanciates a model without verifying data', () => {
			const generic_instance = Model.create({ poulet: 25 });
			const test_instance = MyTestModel.create({ plep: 42 });

			expect(generic_instance).to.be.an.instanceof(Model);
			expect(test_instance).to.be.an.instanceof(MyTestModel);
			expect(test_instance).to.be.an.instanceof(Model);
		});
	});

	const model = MyTestModel.create({ poulet: 32, name: 'test' });
	describe('Instances', () => {
		it('toJSON - Stringifies correcly', () => {
			let json = JSON.stringify(model);
			let parsed = JSON.parse(json);
			for(let [k, v] of Object.entries(parsed)) {
				expect(v).to.be.eql(model[k]);
			}
		});
	});

	describe('Database methods', () => {
		beforeEach(done => {
			connection.db.clear().then(() => done()).catch(e => done(e));
		})
		afterEach(done => {
			connection.db.clear().then(() => done()).catch(e => done(e));
		});

		describe('Save', () => {
			it('save - Should insert if not exists', done => {
				let test = new MyTestModel({ plep: 45 });
				expect(test.poulet).to.not.be.undefined;
				test.save().then((model) => {
					expect(model._id).to.not.be.undefined;
					return MyTestModel.collection.findOne({ plep: 45 });
				}).then(doc => {
					expect(doc.plep).to.be.eql(45);
					expect(doc._id).to.not.be.undefined;
					expect(doc._id).to.not.be.null;
					done();
				}).catch(e => done(e));
			});

			it('save - Should update because exists', done => {
				let test = new MyTestModel({ plep: 45 });
				test.save().then((model) => {
					expect(model._id).to.not.be.undefined;
					return MyTestModel.collection.findOne({ _id: model._id });
				}).then(doc => {
					expect(doc.plep).to.be.eql(45);
					test.chicken = 'my-chicken';
					return test.save();
				}).then(() => {
					return MyTestModel.collection.findOne({ plep: 45 });
				}).then((doc) => {
					expect(doc.chicken).to.be.eql('my-chicken');
					done();
				}).catch(e => done(e));
			});
		});

		describe('Update', () => {
			let model = null;
			beforeEach(done => {
				let test = new MyTestModel({ plep: 45 });
				test.save().then(() => {
					model = test;
					done();
				}).catch(e => done(e));
			});
			it('update - Updates with extra values', done => {
				model.update({
					extra: 100
				}).then(() => {
					return MyTestModel.objects.findOne({
						_id: model._id
					});
				}).then(doc => {
					expect(doc.extra).to.be.eql(100);
					done()
				}).catch(e => {
					done(e);
				});
			});

			it('update - Updates from model values', done => {
				model.extra = 567;
				model.update().then(() => {
					return MyTestModel.objects.findOne({
						_id: model._id
					});
				}).then(doc => {
					expect(doc.extra).to.be.eql(567);
					done()
				}).catch(e => {
					done(e);
				});
			});
		});

		describe('Delete', () => {
			let model = null;
			beforeEach(done => {
				let test = new MyTestModel({ plep: 45 });
				test.save().then(() => {
					model = test;
					done();
				}).catch(e => done(e));
			});

			it('delete - Soft deletes an object', done => {
				model.delete().then(() => {
					return MyTestModel.objects.findOne({
						_id: model._id
					});
				}).then(doc => {
					expect(doc.__deleted).to.not.be.null;
					expect(doc.__deleted).to.not.be.undefined;
					done();
				}).catch(e => {
					done(e);
				});
			});

			it('hard_delete - Hard deletes an object', done => {
				model.hard_delete().then(() => {
					return MyTestModel.objects.findOne({
						_id: model._id
					});
				}).then(doc => {
					expect(doc).to.be.null;
					done();
				}).catch(e => {
					done(e);
				});
			});
		});

		describe.skip('Transactions', () => {
			describe('db.atomic', () => {
				it('db.atomic - It performs a transaction', done => {
					connection.db.atomic(session => {
						let test = new MyTestModel({ plep: 45 });
						return test.save({ session });
					}).then(result => {
						return MyTestModel.objects.get({ plep: 45 });
					}).then(doc => {
						expect(doc).not.to.be.undefined;
						expect(doc.plep).to.be.eql(45);
						done();
					}).catch(e => done(e));
				});

				it('db.atomic - Rollbacks a transaction', done => {
					connection.db.atomic(session => {
						let test = new MyTestModel({ plep: 45 });
						return test.save({ session }).then(() => {
							throw new Error('ROLLBACK ME PLEASE');
						});
					}).then(result => {
						return MyTestModel.objects.get({ plep: 45 });
					}).then(doc => {
						done('Doc exists, not rollbacked!');
					}).catch(e => {
						expect(() => {
							throw e;
						}).to.throw(Error, /No document matching query/);
						done();
					});
				});
			});

			describe('db.transaction', () => {
				it('db.transaction - Queries are called with session when no opts provided', done => {
					// As far as i see, sinon has no option to adjust function length
					let called_correctly = false;
					function no_options_provided(arg1, options) {
						// This is the actual test
						if(options instanceof Object && options.session) {
							called_correctly = true;
						}
					}

					let transaction = connection.db.transaction();
					transaction.add(no_options_provided, 'arg1');
					transaction.commit().then(() => {
						expect(called_correctly).to.be.eql(true);
						done();
					}).catch(e => done(e));
				});

				it('db.transaction - Queries are called with session when no opts provided (promise)', done => {
					// As far as i see, sinon has no option to adjust function length
					let called_correctly = false;
					function no_options_provided(arg1, options) {
						// This is the actual test
						if(options instanceof Object && options.session) {
							called_correctly = true;
						}

						return Promise.resolve();
					}

					let transaction = connection.db.transaction();
					transaction.add(no_options_provided, 'arg1');
					transaction.commit().then(() => {
						expect(called_correctly).to.be.eql(true);
						done();
					}).catch(e => done(e));
				});

				it('db.transaction - Queries are called with session when opts provided', done => {
					// As far as i see, sinon has no option to adjust function length
					let called_correctly = false;
					function no_options_provided(arg1, options) {
						// This is the actual test
						if(options instanceof Object && options.session && options.plep === 45) {
							called_correctly = true;
						}
					}

					let transaction = connection.db.transaction();
					transaction.add(no_options_provided, 'arg1', { plep: 45 });
					transaction.commit().then(() => {
						expect(called_correctly).to.be.eql(true);
						done();
					}).catch(e => done(e));
				});

				it('db.transaction - Queries are called with session when opts provided (promise)', done => {
					// As far as i see, sinon has no option to adjust function length
					let called_correctly = false;
					function no_options_provided(arg1, options) {
						// This is the actual test
						if(options instanceof Object && options.session && options.plep === 45) {
							called_correctly = true;
						}

						return Promise.resolve();
					}

					let transaction = connection.db.transaction();
					transaction.add(no_options_provided, 'arg1', { plep: 45 });
					transaction.commit().then(() => {
						expect(called_correctly).to.be.eql(true);
						done();
					}).catch(e => done(e));
				});

				it('db.transaction - It instanciates a transaction', done => {
					let test = new MyTestModel({ plep: 45 });
					let test2 = new MyTestModel({ plep: 12 });
					let transaction = connection.db.transaction();

					transaction.add(test.save.bind(test));
					transaction.add(test2.save.bind(test2), { checkKeys: true });

					transaction.commit().then(result => {
						console.log('Result', result);
						return MyTestModel.objects.get({ plep: 45 });
					}).then(doc => {
						expect(doc).not.to.be.undefined;
						expect(doc.plep).to.be.eql(45);
						done();
					}).catch(e => done(e));
				});

				it('db.transaction - Rollbacks a transaction', done => {
					let test = new MyTestModel({ plep: 45 });
					let test2 = new MyTestModel({ plep: 12 });
					let transaction = connection.db.transaction();

					transaction.add(test.save.bind(test));
					transaction.add(test2.save.bind(test2), { checkKeys: true });

					const _throw = () => Promise.reject(new Error('Rollback ;)'));
					transaction.add(_throw);

					transaction.commit().then(result => {
						return MyTestModel.objects.get({ plep: 45 });
					}).then(doc => {
						done('Doc exists, not rollbacked!');
					}).catch(e => {
						expect(() => {
							throw e;
						}).to.throw(Error, /Rollback/);
						return MyTestModel.objects.get({ plep: 45 });
					}).then(doc => {
						return done('Doc exists, not rollbacked!');
					}).catch(e => {
						expect(() => {
							throw e;
						}).to.throw(Error, /No document matching query!/);
						done();
					});
				});
			});
		});
	});
});
