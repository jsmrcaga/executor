/**
 * Performs an atomic transaction on MongoDB
 */
class Transaction {
	/**
	 * @param {MongoClient} database 
	 * @param {Object} options - Options for starting transaction
	 */
	constructor(database, options) {
		this.session = database.startSession();
		this.queries = [];
		
		this.session.startTransaction(options);
	}

	/**
	 * Convenience method to not handle promises
	 * @param {Promise[]} queries - DB queries
	 */
	add(...queries) {
		if(queries.some(query => !(query instanceof Promise))) {
			throw new Error('[DB][Transaction] All queries must be instance of promises');
		}

		if(queries.length === 1 && (queries[0] instanceof Array)) {
			queries = queries[0];
		}

		let promisedQueries = queries.map(query => {
			return query.then(function(){ return arguments; }).catch(e => {
				console.error('[Transaction] Error in transaction query', e);
				return e;
			});
		});

		this.queries.push(...promisedQueries);
	}

	/**
	 * Returns pre-prepared options to use with queries
	 * @param {Object} opts - Other options
	 * @returns {Object} merged options
	 */
	options(opts = {}) {
		return Object.assign({
			session: this.session
		}, opts);
	}

	/**
	 * Commit the transaction and end session
	 */
	commit() {
		return new Promise((resolve, reject) => {
			// Ensure all queries have been settled, good idea?
			Promise.all(this.queries).then(() => {
				return this.session.commitTransaction();
			}).then(() => {
				return this.session.endSession({}, function(){ resolve(...arguments) });
			}).catch(e => {
				return this.session.endSession({}, function(){ reject(e) });
			});
		});
	}

	/**
	 * Abort current transaction and end session
	 */
	abort() {
		return new Promise((resolve, reject) => {
			this.session.abortTransaction().then(() => {
				return this.session.endSession({}, function(){ resolve(...arguments) });
			}).catch(e => {
				return this.session.endSession({}, function(){ reject(e) });
			});
		});
	}
}

module.exports = Transaction;
