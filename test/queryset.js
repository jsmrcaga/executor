const { expect } = require('chai');

const fixtures = require('./fixtures');

const Model = require('../lib/models/model');
const Fields = require('../lib/models/fields');
const Queryset = require('../lib/models/queryset');

const Operations = require('../lib/models/queryset/operations');

class MySuperModel extends Model {}

class ModelA extends Model {}
class CustomPk extends Model {}
CustomPk.VALIDATION_SCHEMA = {
	my_pk: new Fields.PrimaryKey()
};

class ModelB extends Model {}
ModelB.VALIDATION_SCHEMA = {
	string: new Fields.String(),
	a: new Fields.ForeignKey({ Model: ModelA }),
	c: new Fields.ForeignKey({ Model: CustomPk, many: true }),
};

describe('Queryset', () => {
	let connection = fixtures.connect();
	let queryset = null;

	// Reset queryset
	beforeEach(() => {
		queryset = new Queryset({ Model: MySuperModel });
	});

	describe('Generic', () => {
		it('Should return a collection from its model', () => {
			expect(queryset.collection).to.be.eql(MySuperModel.collection);
		});
	});

	describe('Utility methods', () => {
		it('create - Should create an object on DB', done => {
			queryset.create({
				poulet: 45
			}).then(doc => {
				expect(doc._id).to.not.be.undefined;
				expect(doc.poulet).to.be.eql(45);
				done();
			}).catch(e => done(e));
		});

		it('bulk_insert - Should create many objects in db', done => {
			let objects = Array(5).fill(0).map((_0, i) => {
				return new MySuperModel({
					plep: i * 5
				});
			});

			queryset.bulk_insert(objects).then(({ insertedCount }) => {
				expect(insertedCount).to.be.eql(5);
				done();
			}).catch(e => done(e));
		});
	});

	describe('Get single object', () => {
		it('get - Gets a single doc and instanciates it', done => {
			let model = new MySuperModel({ plep: 145 });
			model.save().then(() => {
				return queryset.get({
					plep: 145
				});
			}).then(doc => {
				expect(doc).to.be.an.instanceof(MySuperModel);
				expect(doc._id).to.not.be.undefined;
				expect(doc.plep).to.be.eql(145);
				done();
			}).catch(e => done(e));
		});

		it('get - Gets a single doc from previous filterset and instanciates it', done => {
			let model = new MySuperModel({ plep: 145 });
			model.save().then(() => {
				return queryset.filter({
					plep: 145
				}).get();
			}).then(doc => {
				expect(doc).to.be.an.instanceof(MySuperModel);
				expect(doc._id).to.not.be.undefined;
				expect(doc.plep).to.be.eql(145);
				done();
			}).catch(e => done(e));
		});

		it('get - Gets a single doc from previous filterset and adds new filters', done => {
			let model = new MySuperModel({ plep: 145, plop: 1 });
			let model2 = new MySuperModel({ plep: 145, plop: 2 });
			Promise.all([model.save(), model2.save()]).then(() => {
				return queryset.filter({
					plep: 145
				}).get({
					plop:1
				});
			}).then(doc => {
				expect(doc).to.be.an.instanceof(MySuperModel);
				expect(doc._id).to.not.be.undefined;
				expect(doc.plep).to.be.eql(145);
				expect(doc.plop).to.be.eql(1);
				done();
			}).catch(e => done(e));
		});

		it('get - Throws if no objects match ', done => {
			let model = new MySuperModel({ plep: 145, plop: 1 });
			let model2 = new MySuperModel({ plep: 145, plop: 2 });
			Promise.all([model.save(), model2.save()]).then(() => {
				return queryset.filter({
					plep: 145
				}).get({
					plop:5
				});
			}).then(doc => {
				done(new Error('Should not resolve'));
			}).catch(e => {
				expect(/No document/.test(e.message)).to.be.true;
				done();
			});
		});

		it('get - Throws if many objects match ', done => {
			let model = new MySuperModel({ plep: 145, plop: 1 });
			let model2 = new MySuperModel({ plep: 145, plop: 2 });
			Promise.all([model.save(), model2.save()]).then(() => {
				return queryset.filter({
					plep: 145
				}).get();
			}).then(doc => {
				done(new Error('Should not resolve'));
			}).catch(e => {
				expect(/More than/.test(e.message)).to.be.true;
				done();
			});
		});

		it('bulk_update - Not implemented');
	});

	describe('Aggregation operations', () => {
		// Setup
		let querysetA = null;
		let querysetB = null;

		let a1 = new ModelA({ _id: 123, group: 'a', sort: 6 });
		let a2 = new ModelA({ _id: 234, model_b_id: 321, group: 'a', sort: 3 });
		let a3 = new ModelA({ _id: 345, model_b_id: 321, group: 'b', sort: 1 });

		let b1 = new ModelB({
			_id: 321,
			a_id: 123,
			will_be_removed: 'test',
			will_be_kept: 'lolilol',
			sum_me: [1, 2, 3, 4, 5],
			string: 'plep'
		});
		let b2 = new ModelB({ _id: 543, c_id: ['c-slug-1', 'c-slug-2'], string: 'plep'});
		let b3 = new ModelB({ _id: 555, c_id: ['c-slug-1', 'c-slug-2'], a_id: 123, string: 'plep'});
		let b4 = new ModelB({ _id: 666, c_id: ['c-slug-1', 'c-slug-2'], a_id: null, string: 'plep'});

		let c1 = new CustomPk({ my_pk: 'c-slug-1' });
		let c2 = new CustomPk({ my_pk: 'c-slug-2' });

		beforeEach(done => {
			querysetA = new Queryset({ Model: ModelA });
			querysetB = new Queryset({ Model: ModelB });
			querysetC = new Queryset({ Model: CustomPk });

			let promises = [
				connection.db.clear(),
				querysetA.bulk_insert([a1, a2, a3]),
				querysetB.bulk_insert([b1, b2, b3, b4]),
				querysetC.bulk_insert([c1, c2])
			];

			Promise.all(promises).then(() => {
				done();
			}).catch(e => {
				done(e);
			});
		});

		// Tests
		describe('Raw', () => {
			it('Pushes a raw pipeline operation to the stages', () => {
				let qs = queryset.raw({
					$addFields: {
						poulet: 45
					}
				});

				expect(queryset.chain()[0]).to.be.eql({
					$addFields: {
						poulet: 45
					}
				});
				expect(qs).to.be.eql(queryset);
			});
		});

		describe('Operation', () => {
			it('Throws if the param is not an operation', () => {
				expect(() => queryset.operation('plep')).to.throw(Error, /instances of Operation/g);
			});

			it('Can add multiple stages', () => {
				let { pipeline } = querysetA.filter({ id: 32 }).limit(50).filter({ a: 54, b: 36 });
				expect(pipeline.length).to.be.eql(3);
				expect(pipeline[0].definition()).to.be.eql({
					$match: {
						id: 32
					}
				});
				expect(pipeline[1].definition()).to.be.eql({
					$limit: 50
				});
				expect(pipeline[2].definition()).to.be.eql({
					$match: {
						a: 54,
						b: 36
					}
				});
			});
		});

		describe('Filter', () => {
			it('filter - Adds a match stage to the pipeline', () => {
				let { pipeline } = querysetB.filter({ poulet: 54, plep: 'plep' });
				expect(pipeline[0]).to.be.an.instanceof(Operations.FilterOperation);
				expect(pipeline[0].definition()).to.be.eql({
					$match: {
						poulet: 54,
						plep: 'plep'
					}
				});
			});

			it('filter + run - Actually filters data', done => {
				querysetB.filter({ _id: 321, a_id: 123 }).run().toArray().then(docs => {
					// Filter only matches 1 doc
					expect(docs.length).to.be.eql(1);
					let [doc] = docs;
					expect(doc._id).to.be.eql(321);
					expect(doc.a_id).to.be.eql(123);
					done();
				}).catch(e => done(e));
			});

			it('filter + execute/done - Actually filters data', done => {
				querysetB.filter({ _id: 321, a_id: 123 }).done().then(docs => {
					// Filter only matches 1 doc
					expect(docs.length).to.be.eql(1);
					let [doc] = docs;
					expect(doc).to.be.an.instanceof(ModelB);
					expect(doc._id).to.be.eql(321);
					expect(doc.a_id).to.be.eql(123);
					done();
				}).catch(e => done(e));
			});
		});

		describe('Select Related', () => {
			it('select_related - Throws because key is not existant', () => {
				expect(() => querysetA.select_related('poulet')).to.throw(Error, /"poulet" is not defined/g);
				expect(() => querysetB.select_related('poulet')).to.throw(Error, /"poulet" is not defined/g);
			});

			it('select_related - Throws because key is not a schema ForeignKey', () => {
				expect(() => querysetB.select_related('string')).to.throw(Error, /"string" is not a foreign key/g);
			});

			it('select_related - Adds a lookup operation to pipeline by simple _id', () => {
				let { pipeline } = querysetB.select_related('a');
				expect(pipeline[0]).to.be.an.instanceof(Operations.SelectRelatedOperation);
				expect(pipeline[0].definition()).to.be.eql({
					$lookup: {
						as: 'a',
						from: 'model-a',
						localField: 'a_id',
						foreignField: '_id'
					}
				});
			});

			it('select_related + run - Gets related ModelA models', done => {
				querysetB.filter({ _id: 321 }).select_related('a').run().toArray().then(docs => {
					expect(docs.length).to.be.eql(1);
					let [doc] = docs;
					expect(doc).not.to.be.an.instanceof(ModelB);
					expect(doc.a_id).to.be.eql(123);
					expect(doc.a).not.to.be.an.instanceof(ModelA);
					done();
				}).catch(e => done(e));
			});

			it('select_related + execute/done - Gets related ModelA models', done => {
				querysetB.filter({ _id: 321 }).select_related('a').done().then(docs => {
					expect(docs.length).to.be.eql(1);
					let [doc] = docs;
					expect(doc).to.be.an.instanceof(ModelB);
					expect(doc.a_id).to.be.eql(123);
					expect(doc.a).to.be.an.instanceof(ModelA);
					done();
				}).catch(e => done(e));
			});

			it('select_related - Adds a lookup operation to pipeline with custom PK', () => {
				let { pipeline } = querysetB.select_related('c');
				expect(pipeline[0]).to.be.an.instanceof(Operations.SelectRelatedOperation);
				expect(pipeline[0].definition()).to.be.eql({
					$lookup: {
						as: 'c',
						from: 'custom-pk',
						localField: 'c_id',
						foreignField: 'my_pk'
					}
				});
			});

			it('select_related + execute/done + array - Gets related CustomPK models from Array', done => {
				let qs = querysetB.filter({ _id: 543 }).select_related('c');
				qs.done().then(docs => {
					expect(docs.length).to.be.eql(1);
					let [doc] = docs;
					expect(doc).to.be.an.instanceof(ModelB);
					expect(Array.isArray(doc.c_id)).to.be.true;
					expect(Array.isArray(doc.c)).to.be.true;
					expect(doc.c.length).to.be.gt(0);
					expect(doc.c.every(c => c instanceof CustomPk)).to.be.true;
					done();
				}).catch(e => done(e));
			});

			it('select_related - Gets multiple select related values chaining select_related', done => {
				let qs = querysetB.filter({ _id: 555 }).select_related('a').select_related('c');
				qs.done().then(docs => {
					expect(docs.length).to.be.eql(1);
					const [doc] = docs;

					expect(doc).to.be.an.instanceof(ModelB);
					expect(Array.isArray(doc.c_id)).to.be.true;
					expect(Array.isArray(doc.c)).to.be.true;
					expect(doc.c.every(c => c instanceof CustomPk)).to.be.true;
					expect(doc.a instanceof ModelA).to.be.true;
					done();
				}).catch(e => done(e));
			});

			it('select_related - Gets multiple select related values with one call', done => {
				let qs = querysetB.filter({ _id: 555 }).select_related('a', 'c');
				qs.done().then(docs => {
					expect(docs.length).to.be.eql(1);
					const [doc] = docs;

					expect(doc).to.be.an.instanceof(ModelB);
					expect(Array.isArray(doc.c_id)).to.be.true;
					expect(Array.isArray(doc.c)).to.be.true;
					expect(doc.c.every(c => c instanceof CustomPk)).to.be.true;
					expect(doc.a instanceof ModelA).to.be.true;
					done();
				}).catch(e => done(e));
			});

			it('select_related - Understands null values', done => {
				let qs = querysetB.filter({ _id: 666 }).select_related('a');
				qs.done().then(docs => {
					expect(docs.length).to.be.eql(1);
					const [doc] = docs;

					expect(doc).to.be.an.instanceof(ModelB);
					expect(doc.a_id).to.be.null;
					expect(doc.a).to.be.null;
					done();
				}).catch(e => done(e));
			});
		});

		describe('Reverse Related', () => {
			it('reverse_related - Throws because key is not existant', () => {
				expect(() => querysetA.reverse_related('poulet')).to.throw(Error, /RelatedModel must be an instance/g);
				expect(() => querysetB.reverse_related('poulet')).to.throw(Error, /RelatedModel must be an instance/g);
			});

			// let a2 = new ModelA({ _id: 234, model_b_id: 321 });
			// let a3 = new ModelA({ _id: 345, model_b_id: 321 });

			// let b1 = new ModelB({ _id: 321, a_id: 123 });

			it('reverse_related - Adds a lookup operation and a project operation', () => {
				let { pipeline } = querysetB.select_related(ModelA);
				expect(pipeline[0]).to.be.an.instanceof(Operations.SelectRelatedOperation);
				expect(pipeline[0].definition()).to.be.eql({
					$lookup: {
						as: 'model_as',
						from: 'model-a',
						localField: '_id',
						foreignField: 'model_b_id'
					}
				});
			});

			it('reverse_related - Adds a lookup operation and a project operation with custom pk', () => {
				let { pipeline } = querysetC.select_related(ModelA);
				expect(pipeline[0]).to.be.an.instanceof(Operations.SelectRelatedOperation);
				expect(pipeline[0].definition()).to.be.eql({
					$lookup: {
						as: 'model_as',
						from: 'model-a',
						localField: 'my_pk',
						foreignField: 'custom_pk_id'
					}
				});
			});

			it('reverse_related + run - Gets related ModelA models', done => {
				querysetB.filter({ _id: 321 }).reverse_related(ModelA).run().toArray().then(docs => {
					expect(docs.length).to.be.eql(1);
					let [doc] = docs;
					expect(doc).not.to.be.an.instanceof(ModelB);
					expect(Array.isArray(doc.model_as)).to.be.true;
					expect(doc.model_as.every(a => a instanceof ModelA)).to.be.false;
					done();
				}).catch(e => done(e));
			});

			it('reverse_related + execute/done - Gets related ModelA models', done => {
				querysetB.filter({ _id: 321 }).reverse_related(ModelA).done().then(docs => {
					expect(docs.length).to.be.eql(1);
					let [doc] = docs;
					expect(doc).to.be.an.instanceof(ModelB);
					expect(Array.isArray(doc.model_as)).to.be.true;
					// TODO: find a way to instanciate reverse models
					// expect(doc.model_as.every(a => a instanceof ModelA)).to.be.true;
					done();
				}).catch(e => done(e));
			});
		});

		describe('Limit', () => {
			it('limit - Should add a limit operation to the pipeline', () => {
				let { pipeline } = querysetB.limit(145);
				expect(pipeline[0].definition()).to.be.eql({
					$limit: 145
				});
			});

			it('limit - Should limit the number of retrieved docs', done => {
				querysetB.limit(1).done().then(docs => {
					expect(docs.length).to.be.eql(1);
					done();
				}).catch(e => done(e));
			});
		});

		describe('Project', () => {
			it('project - Should add a project operation to the pipeline', () => {
				let { pipeline } = querysetB.project({
					will_be_removed: 0,
					will_be_kept: true
				});
				expect(pipeline[0].definition()).to.be.eql({
					$project: {
						will_be_removed: 0,
						will_be_kept: true
					}
				});
			});

			it('project - Should modify retrieved docs fields', done => {
				querysetB.project({
					will_be_added: 'test',
					will_be_kept: true
				}).done().then(docs => {
					let doc = docs.find(({ _id }) => _id === 321);
					expect(doc).not.to.have.property('will_be_removed');
					expect(doc.will_be_kept).to.be.eql('lolilol');
					expect(doc.will_be_added).to.be.eql('test');
					done();
				}).catch(e => done(e));
			});

			it('values - Should keep some values by using a list', done => {
				querysetB.values('will_be_kept', '_id', 'sum_me').done().then(docs => {
					let doc = docs.find(({ _id }) => _id === 321);
					expect(doc).not.to.have.property('will_be_removed');
					expect(doc.will_be_kept).to.be.eql('lolilol');
					expect(doc.sum_me).to.not.be.undefined;
					done();
				}).catch(e => done(e));
			});
		});

		describe('Annotate', () => {
			it('annotate - Should add an annotation operation to the pipeline', () => {
				let { pipeline } = querysetB.annotate({
					poulet: 25,
					plep: 26
				});
				expect(pipeline[0].definition()).to.be.eql({
					$addFields: {
						poulet: 25,
						plep: 26
					}
				});
			});

			it('annotate - Should add a static & computed field', done => {
				querysetB.annotate({
					poulet: 'test',
					weird: {
						$sum: '$sum_me'
					}
				}).done().then(docs => {
					let doc = docs.find(({ _id }) => _id === 321);
					expect(doc.poulet).to.be.eql('test');
					expect(doc.weird).to.be.eql(1 + 2 + 3 + 4 + 5);
					done();
				}).catch(e => done(e));
			});
		});

		describe('Group', () => {
			it('group - Throws if no _id on group query', () => {
				expect(() => queryset.group({ plep: 5 })).to.throw(Error, /Group operation requires an/g);
			});

			it('group - Should add a group operation to the pipeline', () => {
				let { pipeline } = querysetB.group({
					_id: 'PLEP',
					poulet: {
						$sum: '$item'
					}
				});
				expect(pipeline[0].definition()).to.be.eql({
					$group: {
						_id: 'PLEP',
						poulet: {
							$sum: '$item'
						}
					}
				});
			});

			it('group - Should group items by a given field', done => {
				querysetA.group({
					_id: '$group',
					docs: {
						$push: {
							_id: '$_id',
						}
					}
				}).run().toArray().then(docs => {
					// 2 groups
					expect(docs.length).to.be.eql(2);
					let a = docs.find(({ _id }) => _id === 'a');
					let b = docs.find(({ _id }) => _id === 'b');
					expect(a.docs.length).to.be.eql(2);
					expect(b.docs.length).to.be.eql(1);
					done();
				}).catch(e => done(e));
			});
		});

		describe('Sort', () => {
			it('sort - Should add a sort operation to the pipeline', () => {
				let { pipeline } = querysetA.sort({
					group: -1,
					sort: 1					
				});
				expect(pipeline[0].definition()).to.be.eql({
					$sort: {
						group: -1,
						sort: 1					
					}
				});
			});

			it('sort - Should sort elements', done => {
				querysetA.sort({
					sort: 1
				}).done().then(docs => {
					let ids = [a1, a2, a3].sort((a, b) => a.sort - b.sort).map(el => el._id);
					let docs_ids = docs.map(el => el._id);
					expect(docs_ids).to.be.eql(ids);
					done();
				}).catch(e => done(e));
			});
		});
	});
});
