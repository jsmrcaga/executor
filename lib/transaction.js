class Transaction {
	constructor(db) {
		this.db = db;

		this.queries = [];
	}

	add(fn, ...args) {
		this.queries.push({
			args,
			query: fn,
		});
	}

	commit() {
		return this.db.atomic(session => {
			// Get queries and calculate length,
			// pass options with session
			let promises = this.queries.map(({ query, args }) => {
				let args_nb = query.length;
				let options = { session };

				// If options already provided, replace them with
				// options containing session
				if(args.length === args_nb) {
					let args_opt = args[args.length - 1];
					options = {...args_opt, ...options};
					args[args.length - 1] = options;
				} else {
					// If enough args are not provided, will fill up
					let missing_args = args_nb - args.length;
					if(missing_args > 0) {
						let fill = Array(missing_args - 1).fill(undefined);
						fill.push(options);
						args.push(...fill);
					}
				}

				try {
					let ret = query(...args);
					if(ret instanceof Promise) {
						return ret;
					}

					return Promise.resolve(ret);
				} catch(e) {
					return Promise.reject(e);
				}
 			});

			return Promise.all(promises);
		});
	}
}

module.exports = Transaction;
