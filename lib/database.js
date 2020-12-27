const { prop_proxy } = require('./utils/utils');
const Transaction = require('./transaction');

const DBProxy = {
	get: (obj, prop) => {
		if(prop in obj) {
			return prop_proxy(obj, prop);
		}

		let { db } = obj;
		return prop_proxy(db, prop);
	}
};

class Database {
	constructor({ db, mongo }) {
		if(!db || !mongo) {
			throw new Error('Cannot instanciate without db/mongo params. Please don\'t instanciate direcly, use Mongo.db()');
		}

		this.db = db;
		this.mongo = mongo;

		return new Proxy(this, DBProxy);
	}

	clear(options) {
		return this.db.dropDatabase(options);
	}

	atomic(fn, options) {
		const session = this.mongo.startSession();
		return session.withTransaction(() => fn(session)).finally(() => {
			session.endSession();
		});
	}

	transaction() {
		return new Transaction(this);
	}
}

module.exports = Database;
