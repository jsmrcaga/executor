const Mongo = require('../lib/mongo');
const Database = require('../lib/database');
const { expect } = require('chai');

describe('Mongo Client', () => {
	const connection_config = {
		url: `mongodb://db:27017/mongo?replicaSet=mongoset&directConnection=true`,
		options: {
			useUnifiedTopology: true
		},
		database: 'mongo'
	};

	it('Connects (& disconnects) to mongo instance using config', done => {
		const mongo = new Mongo.constructor();
		mongo.init(connection_config);
		mongo.connect().then(() => {
			return mongo.disconnect();
		}).then(() => {
			done();
		}).catch(e => done(e));
	});

	it('Connects (& disconnects) to mongo instance from connect method', done => {
		const mongo = new Mongo.constructor();
		mongo.connect(connection_config).then(() => {
			return mongo.disconnect();
		}).then(() => {
			done();
		}).catch(e => done(e));
	});

	it('Can call MongoClient params directly once connected', done => {
		const mongo = new Mongo.constructor();
		mongo.connect(connection_config).then(() => {
			expect(mongo.watch).to.not.be.undefined;
			done();
		}).catch(e => done(e));
	});

	it('Returns a database from config name', done => {
		const mongo = new Mongo.constructor();
		mongo.connect(connection_config).then(() => {
			let db = mongo.db();
			expect(db).to.be.an.instanceof(Database);
			return db.stats();
		}).then(({ db }) => {
			expect(db).to.be.eql(connection_config.database);
			return mongo.disconnect();
		}).then(() => {
			done();
		}).catch(e => done(e));
	});

	it('Returns a database called poulet', done => {
		const mongo = new Mongo.constructor();
		mongo.connect(connection_config).then(() => {
			let db = mongo.db('poulet');
			expect(db).to.be.an.instanceof(Database);
			return db.stats();
		}).then(({ db }) => {
			expect(db).to.be.eql('poulet');
			return mongo.disconnect();
		}).then(() => {
			done();
		}).catch(e => done(e));
	});
});
