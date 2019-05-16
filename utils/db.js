let db = {};

db.update = function(collection, object, options = {}) {
	if (!object.id) {
		let e =  new Error('[DB][UPDATE] Object does not have ID to replace (update)');
		e.object = object;
		throw e;
	}

	// Last update date
	object.__updated = Date.now();

	let replacer = { id: object.id };

	if(!object._id){
		return collection.insertOne(object, options).then(() => object);
	}

	return collection.findOneAndReplace(replacer, object, options).then(res => {
		if(res.lastErrorObject && !res.lastErrorObject.updatedExisting) {
			return collection.insertOne(object, options).then(() => object);
		}

		return object;
	});
};

db.updateMany = function(collection, objects, options = {}) {
	let p = [];

	objects.forEach(obj => {
		p.push(db.update(collection, obj, options));
	});

	return Promise.all(p).then(() => objects);
};

db.deleteMany = function(collection, objects, options = {}) {
	let ids = objects.map(obj => obj.id);
	return collection.deleteMany({
		id: {
			$in: ids
		}
	}, options);
};

db.delete = function(collection, object, options = {}) {
	return db.deleteMany(collection, [object], options);
};

module.exports = db;
