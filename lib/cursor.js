const CursorProxy  = (cursor) => {
	let ownProps = Object.getOwnPropertyNames(cursor);
	
	return {
		get: (obj, prop) => {
			if(ownProps.indexOf(prop) > -1 || obj[prop]) {
				return obj[prop];
			}

			let mongo_cursor = cursor.cursor;
			if(mongo_cursor[prop]) {
				return mongo_cursor[prop];
			}
		}
	};
};


/**
 * Proxies a cursor
 */
class Cursor {
	constructor({ cursor, model }) {
		this.cursor = cursor;
		this.model = model;
		return new Proxy(this, CursorProxy(this));
	}

	execute() {
		return this.cursor.toArray().then(objs => {
			return this.model.fromJSON(objs);
		});
	}
}

module.exports = Cursor;
