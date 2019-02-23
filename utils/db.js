let db = {};

db.update = function(collection, object) {
	if (!object.id) {
		let e =  new Error('[DB][UPDATE] Object does not have ID to replace (update)');
		e.object = object;
		throw e;
	}

	// Last update date
	object.__updated = Date.now();

	let replacer = { id: object.id };

	return collection.findOneAndReplace(replacer, object).then(res => {
		if(res.lastErrorObject && !res.lastErrorObject.updatedExisting) {
			return collection.insertOne(object).then(() => object);
		}

		return object;
	});
};

db.updateMany = function(collection, objects) {
	let p = [];

	objects.forEach(obj => {
		p.push(db.update(collection, obj));
	});

	return Promise.all(p).then(() => objects);
};

db.deleteMany = function(collection, objects) {
	let ids = objects.map(obj => obj.id);
	return collection.deleteMany({
		id: {
			$in: ids
		}
	});
};

db.delete = function(collection, object) {
	return db.deleteMany(collection, [object]);
};

module.exports = db;
