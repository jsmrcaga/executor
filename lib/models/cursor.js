const { AggregationCursor } = require('mongodb');

const CursorProxy = {
	get: (obj, prop) => {
		if(prop in obj) {
			return obj[prop];
		}

		if(prop in obj.cursor) {
			return obj.cursor[prop];
		}
	}
};

// Wraps current mongo driver cursor
class Cursor {
	constructor({ cursor, Model }) {
		this.cursor = cursor;
		this.Model = Model;

		return new Proxy(this, CursorProxy);
	}

	instanciate(doc) {
		return this.Model.create(doc);
	}

	// Maps using next() on cursor (for aggregation cursor)
	// for example
	next_map(fn, acc=[]) {
		return this.next().then(doc => {
			if(!doc) {
				return acc;
			}

			acc.push(fn(doc));
			// Reuturns promise, so we have a recursive promise 🤯
			// Nice ain't it?
			return this.next_map(fn, acc);
		});
	}

	// Map wrapper
	map(fn) {
		// AggregationCursor does not implement own map method
		if(this.cursor instanceof AggregationCursor) {
			return this.next_map(fn);
		}

		let cursor = this.cursor.map(doc => {
			let model = this.instanciate(doc);
			return fn(model);
		});

		return new this.constructor({
			cursor,
			Model: this.Model,
		});
	}

	// forEach wrapper
	forEach(fn, ...params) {
		return this.cursor.forEach(doc => {
			let model = this.instanciate(doc);
			return fn(model);
		}, ...params);
	}

	// next wrapper
	next(...args) {
		return this.cursor.next(...args).then(doc => this.instanciate(doc));
	}

	execute() {
		return this.cursor.toArray().then(objs => {
			return objs.map(obj => this.Model.create(obj));
		});
	}
}

module.exports = Cursor;
