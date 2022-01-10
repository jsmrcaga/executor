const { Collection } = require('mongodb');
const { expect } = require('chai');
const Model = require('../lib/models/model');
const Fields = require('../lib/models/fields');
const Manager = require('../lib/models/manager');

const Database = require('../lib/database');

const fixtures = require('./fixtures');

// Test class
class MyTestModel extends Model {}
MyTestModel.VALIDATION_SCHEMA = {
	poulet: new Fields.PrimaryKey({
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
			expect(test_pk_field).to.be.an.instanceof(Fields.PrimaryKey);

			expect(generic_pk).to.be.eql('_id');
			expect(test_pk).to.be.eql('poulet');
		});

		it('create - Instanciates a model without verifying data', () => {
			const generic_instance = Model.create({ poulet: 25 });
			const test_instance = MyTestModel.create({ plep: 42, poulet: 'my-poulet-key' });

			expect(generic_instance).to.be.an.instanceof(Model);
			expect(generic_instance.poulet).to.be.eql(25);
			expect(test_instance).to.be.an.instanceof(MyTestModel);
			expect(test_instance).to.be.an.instanceof(Model);
			expect(test_instance.plep).to.be.eql(42);
			expect(test_instance.poulet).to.be.eql('my-poulet-key');
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

		it('Retrieves a model with PK', done => {
			let model = new MyTestModel({ test: 'chicken' });
			expect(model.poulet).to.not.be.undefined;
			const pk = model.pk;
			const created = model.__created;

			model.save().then(() => {
				return MyTestModel.objects.get({ test: 'chicken' });
			}).then(newModel => {
				expect(newModel.poulet).to.be.eql(pk);
				expect(newModel.pk).to.be.eql(pk);
				expect(newModel.__updated).to.be.eql(null);
				expect(newModel.__created).to.be.eql(created);
				return MyTestModel.objects.find({ test: 'chicken' }).execute();
			}).then(([newModel]) => {
				expect(newModel.poulet).to.be.eql(pk);
				expect(newModel.pk).to.be.eql(pk);
				expect(newModel.__created).to.be.eql(created);
				done();
			}).catch(e => done(e));
		});

		it('Instanciates a model with default values', () => {
			class Model2 extends Model {}
			Model2.VALIDATION_SCHEMA = {
				primary: new Fields.PrimaryKey({
					defaultValue: () => Math.floor(Math.random() * 0x100000).toString(16)
				}),
				str: new Fields.String({
					defaultValue: 'plp'
				}),
				nb: new Fields.PositiveInteger({
					defaultValue: () => 54
				}),
				noop: new Fields.String()
			};

			const model = new Model2();
			expect(model.pk).not.to.be.null;
			expect(model.str).to.be.eql('plp');
			expect(model.nb).to.be.eql(54);
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
				let test = new MyTestModel({ plep: 45, existing_value: 'my-value' });
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

			it('update - Updates an existing value', done => {
				model.existing_value = 'another value';
				model.update().then(() => {
					return MyTestModel.objects.findOne({
						_id: model._id
					});
				}).then(doc => {
					expect(doc.existing_value).to.be.eql('another value');
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

	describe('Fields', () => {
		it('Should fill model with default values', () => {
			class TestModel extends Model {}
			TestModel.VALIDATION_SCHEMA = {
				test_field: new Fields.String({ defaultValue: () => 'functional vlaue' }),
				test_field_auto: new Fields.Number({ defaultValue: 54 }),
				default_empty_string: new Fields.String({ defaultValue: '', blank: true }),
				default_zero: new Fields.Number({ defaultValue: 0 }),
				default_null: new Fields.Number({ nullable: true, defaultValue: null }),
				default_false: new Fields.Boolean({ nullable: true, defaultValue: false }),
			};

			const model = new TestModel();
			expect(model.test_field).to.be.eql('functional vlaue');
			expect(model.test_field_auto).to.be.eql(54);

			expect(model.default_empty_string).to.be.eql('');
			expect(model.default_zero).to.be.eql(0);
			expect(model.default_null).to.be.eql(null);
			expect(model.default_false).to.be.eql(false);
		});

		it('Should store a direct foreign key with _id from instance', done => {
			class FKModel extends Model {}
			FKModel.VALIDATION_SCHEMA = {
				plep: new Fields.PrimaryKey({ defaultValue: () => Math.random() }),
			};

			class TestModel extends Model {}
			TestModel.VALIDATION_SCHEMA = {
				mm: new Fields.ForeignKey({ Model: FKModel, nullable: false })
			};

			// With instance
			const fk = new FKModel();
			const t_m = new TestModel({
				mm: fk
			});
			fk.save().then(() => {
				return t_m.save();
			}).then(() => {
				return TestModel.objects.filter().done();
			}).then(([test_model]) => {
				expect(test_model.mm_id).to.be.eql(fk.pk);
				return TestModel.objects.all().select_related('mm').done();
			}).then(([test_model]) => {
				expect(test_model.mm).to.be.instanceof(FKModel);
				expect(test_model.mm.pk).to.be.eql(fk.pk);
				expect(test_model.mm_id).to.be.eql(fk.pk);
				done();
			}).catch(e => {
				done(e);
			});
		});

		it('Should store a direct foreign key with key_id with direct pk', done => {
			class FKModel extends Model {}
			FKModel.VALIDATION_SCHEMA = {
				plep: new Fields.PrimaryKey({ defaultValue: () => Math.random() }),
			};

			class TestModel extends Model {}
			TestModel.VALIDATION_SCHEMA = {
				mm: new Fields.ForeignKey({ Model: FKModel, nullable: false })
			};

			// With instance
			const fk = new FKModel();
			const t_m = new TestModel({
				// works because PK is precalculated
				mm_id: fk.pk
			});

			const db_form = t_m.toDataBase();
			expect(db_form).to.have.property('mm_id');
			expect(db_form).to.not.have.property('mm');
			expect(db_form.mm_id).to.be.eql(fk.pk);

			fk.save().then(() => {
				return t_m.save();
			}).then(() => {
				return TestModel.objects.filter().done();
			}).then(([test_model]) => {
				expect(test_model.mm_id).to.be.eql(fk.pk);
				return TestModel.objects.all().select_related('mm').done();
			}).then(([test_model]) => {
				expect(test_model.mm).to.be.instanceof(FKModel);
				expect(test_model.mm.pk).to.be.eql(fk.pk);
				expect(test_model.mm_id).to.be.eql(fk.pk);
				done();
			}).catch(e => {
				done(e);
			});
		});

		it('Should store foreign keys in array and be able to get objects back', done => {
			class FKModel extends Model {}
			FKModel.VALIDATION_SCHEMA = {
				plep: new Fields.PrimaryKey({ defaultValue: () => Math.random() }),
			};

			class TestModel extends Model {}
			TestModel.VALIDATION_SCHEMA = {
				mm: new Fields.ForeignKey({ many: true, Model: FKModel, nullable: false })
			};

			// With instance
			const fk = new FKModel();
			const fk2 = new FKModel();

			const t_m = new TestModel({
				mm: [fk, fk2]
			});

			const db_form = t_m.toDataBase();
			expect(db_form).to.have.property('mm_ids');
			expect(db_form).to.not.have.property('mm');
			expect(db_form.mm_ids.every(item => !(item instanceof Object))).to.be.true;

			Promise.all([fk.save(), fk2.save()]).then(() => {
				return t_m.save();
			}).then(() => {
				return TestModel.objects.filter().done();
			}).then(([test_model]) => {
				expect(Array.isArray(test_model.mm_ids)).to.be.true;
				expect(test_model.mm_ids[0]).to.be.eql(fk.pk);
				expect(test_model.mm_ids[1]).to.be.eql(fk2.pk);
				return TestModel.objects.all().select_related('mm').done();
			}).then(([test_model]) => {
				expect(Array.isArray(test_model.mm)).to.be.true;
				expect(test_model.mm[0]).to.be.instanceof(FKModel);
				expect(test_model.mm[1]).to.be.instanceof(FKModel);
				expect(test_model.mm[0].pk).to.be.eql(fk.pk);
				expect(test_model.mm[1].pk).to.be.eql(fk2.pk);
				done();
			}).catch(e => {
				done(e);
			});
		});

		it('Should store foreign keys in array from instances', done => {
			class FKModel extends Model {}
			FKModel.VALIDATION_SCHEMA = {
				plep: new Fields.PrimaryKey({ defaultValue: () => Math.random() }),
			};

			class TestModel extends Model {}
			TestModel.VALIDATION_SCHEMA = {
				mm: new Fields.ForeignKey({ many: true, Model: FKModel, nullable: false })
			};

			// With instance
			const fk = new FKModel();
			const fk2 = new FKModel();

			const t_m = new TestModel({
				mm: [fk, fk2]
			});

			const db_form = t_m.toDataBase();
			expect(db_form).to.have.property('mm_ids');
			expect(db_form).to.not.have.property('mm');
			expect(db_form.mm_ids.every(item => !(item instanceof Object))).to.be.true;

			Promise.all([fk.save(), fk2.save()]).then(() => {
				return t_m.save();
			}).then(() => {
				return TestModel.objects.filter().done();
			}).then(([test_model]) => {
				expect(Array.isArray(test_model.mm_ids)).to.be.true;
				expect(test_model.mm_ids[0]).to.be.eql(fk.pk);
				expect(test_model.mm_ids[1]).to.be.eql(fk2.pk);
				return TestModel.objects.all().select_related('mm').done();
			}).then(([test_model]) => {
				expect(Array.isArray(test_model.mm)).to.be.true;
				expect(test_model.mm[0]).to.be.instanceof(FKModel);
				expect(test_model.mm[1]).to.be.instanceof(FKModel);
				expect(test_model.mm[0].pk).to.be.eql(fk.pk);
				expect(test_model.mm[1].pk).to.be.eql(fk2.pk);
				done();
			}).catch(e => {
				done(e);
			});
		});

		it('Should store foreign keys and retrieve a single item', done => {
			class FKModel extends Model {}
			FKModel.VALIDATION_SCHEMA = {
				plep: new Fields.PrimaryKey({ defaultValue: () => Math.random() }),
			};

			class TestModel extends Model {}
			TestModel.VALIDATION_SCHEMA = {
				str: new Fields.String(),
				mm: new Fields.ForeignKey({ many: true, Model: FKModel, defaultValue: [] })
			};

			const t_m = new TestModel({ str: 'plep' });

			const db_form = t_m.toDataBase();
			expect(db_form).to.have.property('mm_ids');
			expect(db_form).to.not.have.property('mm');
			expect(db_form.mm_ids.every(item => !(item instanceof Object))).to.be.true;

			t_m.save().then((t_m) => {
				expect(t_m).to.have.property('_id');
				return TestModel.objects.get({ _id: t_m._id});
			}).then((test_model) => {
				expect(Array.isArray(test_model.mm_ids)).to.be.true;
				expect(test_model.mm_ids).to.have.length(0);
				done();
			}).catch(e => {
				done(e);
			});
		});
	})
});
