const Mongo = require('../lib/mongo');
const Database = require('../lib/database');
const { expect } = require('chai');

describe('Mongo Client', () => {
	const connection_config = {
		url: `mongodb://db:27017/mongo`,
		options: {
			useUnifiedTopology: true
		},
		database: 'mongo'
	};

	it('Builds URL from config options', () => {
		const mongo = new Mongo.constructor();
		mongo.config({
			connection: {
				host: 'host',
				database: 'db',
				protocol: 'mongodb',
				port: 1234,
				username: 'username',
				password: 'password',
				query: {
					direct: true
				}
			}
		});

		expect(mongo.get_connection_url()).to.be.eql('mongodb://username:password@host:1234/db?direct=true');
	});

	it('Connects (& disconnects) to mongo instance using config', done => {
		const mongo = new Mongo.constructor();
		mongo.config(connection_config);
		mongo.connect().then(() => {
			return mongo.disconnect();
		}).then(() => {
			done();
		}).catch(e => done(e));
	});

	it('Connects (& disconnects) to mongo instance using config with connection_options', done => {
		const mongo = new Mongo.constructor();
		mongo.config({
			connection: {
				protocol: 'mongodb',
				host: 'db',
				port: 27017,
				database: 'mongo',
			},
			options: {
				useUnifiedTopology: true
			}
		});
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
