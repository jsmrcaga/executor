const { expect } = require('chai');

const Model = require('../lib/models/model');
const Manager = require('../lib/models/manager');
const Queryset = require('../lib/models/queryset');
const Cursor = require('../lib/models/cursor');

const fixtures = require('./fixtures');

class MyModel extends Model {}

class CustomManager extends Manager {}

class MyCustomModel extends Model {}
MyCustomModel.MANAGER_CLASS = CustomManager;

class MyCustomManagerModel extends Model {
	static get objects() {
		return new CustomManager(this);
	}
}

describe('Manager', () => {
	fixtures.connect();

	it('constructor - Cannot be instanciated without a Model', done => {
		try {
			let m = new Manager();
			done(new Error('Not thrown'));
		} catch(e) {
			done();
		}
	});

	it('aggregation_queryset - Returns an instance of Queryset', () => {
		let manager = new Manager(Model);
		let queryset = manager.aggregation_queryset();
		expect(queryset).to.be.an.instanceof(Queryset);
	});

	describe('Proxy', () => {
		let manager = new Manager(Model);

		it('queryset - Calls queryset methods', () => {
			expect(manager.active).to.not.be.undefined;
			expect(manager.collection).to.not.be.undefined;
			expect(manager.get).to.not.be.undefined;
		});

		it('queryset - Returns an instance of Queryset', () => {
			expect(manager.active()).to.be.an.instanceof(Queryset);
		});

		it('collection - Calls collection methods', () => {
			expect(manager.findOne).to.not.be.undefined;
			expect(manager.collectionName).to.be.eql('model');
		});

		it('collection/cursor - Proxies cursor methods', () => {
			expect(manager.find({})).to.be.an.instanceof(Cursor);
		});
	});
});
