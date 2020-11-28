const Mongo = require('../lib/mongo');
const Database = require('../lib/database');
const { expect } = require('chai');

describe('Mongo Client', () => {
	const connection_config = {
		url: `mongodb://db:27017/mongo?authSource=admin`,
		options: {
			useUnifiedTopology: true
		},
		database: 'mongo'
	};
	it('Connects (& disconnects) to mongo instance using config', done => {
		Mongo.config(connection_config);
		Mongo.connect().then(() => {
			expect(Mongo.client.isConnected()).to.be.eql(true);
			return Mongo.disconnect();
		}).then(() => {
			done();
		}).catch(e => done(e));
	});

	it('Connects (& disconnects) to mongo instance from connect method', done => {
		Mongo.connect(connection_config).then(() => {
			expect(Mongo.client.isConnected()).to.be.eql(true);
			return Mongo.disconnect();
		}).then(() => {
			done();
		}).catch(e => done(e));
	});

	it('Can call MongoClient params directly', () => {
		expect(Mongo.isConnected()).to.be.eql(false);
		expect(Mongo.watch).to.not.be.undefined;
	});

	it('Returns a database from config name', done => {
		Mongo.connect(connection_config).then(() => {
			let db = Mongo.db();
			expect(db).to.be.an.instanceof(Database);
			return db.stats();
		}).then(({ db }) => {
			expect(db).to.be.eql(connection_config.database);
			return Mongo.disconnect();
		}).then(() => {
			done();
		}).catch(e => done(e));
	});

	it('Returns a database called poulet', done => {
		Mongo.connect(connection_config).then(() => {
			let db = Mongo.db('poulet');
			expect(db).to.be.an.instanceof(Database);
			return db.stats();
		}).then(({ db }) => {
			expect(db).to.be.eql('poulet');
			return Mongo.disconnect();
		}).then(() => {
			done();
		}).catch(e => done(e));
	});
});
