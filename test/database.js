const { Db } = require('mongodb');
const Mongo = require('../lib/mongo');
const { expect } = require('chai');
const fixtures = require('./fixtures');

describe('Database', () => {
	// before each & afetr each
	const connection = fixtures.connect();

	it('Possesses a db property instanciated from mongodb driver', () => {
		expect(connection.db.db).to.be.instanceof(Db);
	});

	it('Can call Db (mongdb) properties directly', () => {
		expect(connection.db.collection).to.not.be.undefined;
		expect(connection.db.collection('users')).to.not.be.undefined;
		expect(connection.db.createIndex).to.not.be.undefined;
	});
});
