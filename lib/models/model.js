const Manager = require('./manager');
const Fields = require('./fields');
const mongo = require('../mongo');

const ModelProxy = {
	set: (obj, prop, val) => {
		Fields.validate_field(obj, prop, val);
		obj[prop] = val;
		return true;
	}
};

class Model {
	constructor({ __deleted=null, __created=Date.now(), __updated=null, ...params }={}, validate=true){
		if(!(params instanceof Object)) {
			throw new Error('Models can only be instanciated with an object as parameter');
		}

		if(validate) {
			// Validate object
			Fields.validate(this, params);
		}

		// Create PK if needed
		let { pk, key } = Fields.get_pk(this, params);
		
		this[key] = pk;
		this.__updated = __updated;
		this.__created = __created;
		this.__deleted = __deleted;

		for(let [k, v] of Object.entries(params)) {
			this[k] = v;
		}

		// Return special Proxy
		return new Proxy(this, ModelProxy);
	}

	static get db() {
		return mongo.db(this.DATABASE);
	}

	static get objects() {
		let ManagerClass = this.MANAGER_CLASS || Manager;
		return new ManagerClass(this);
	}

	static get collection_name() {
		let { COLLECTION, name } = this;
		let _name = (COLLECTION || name);
		return _name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
	}

	static get collection() {
		return this.db.collection(this.collection_name);
	}

	static get pk() {
		return Fields.pk(this.VALIDATION_SCHEMA);
	}

	static create(values={}) {
		// Used from DB, values are casted
		let casted_values = Fields.populate(this, values);
		return new this(casted_values, false);
	}

	get pk() {
		let [key] = this.constructor.pk;
		return this[key];
	}

	toJSON() {
		// TODO: serializers ?
		return this;
	}

	update(data={}, options={ validate: true }) {
		if(!this._id) {
			throw new Error('Cannot update document, it does not have an _id (not in db yet). Use model.save()');
		}

		if(!('validate' in options)) {
			options.validate = true;
		}

		if(options.validate) {
			// Validate object
			Fields.validate(this, data, { partial: true });
		}

		let { __updated } = this;
		this.__updated = Date.now();
		// We don't want to send _id as $set
		let { _id, ...rest } = this;

		return this.constructor.collection.updateOne({
			_id: this._id
		}, {
			$set: {...rest, ...data}
		}, options).then(({ modifiedCount }) => {
			if(!modifiedCount) {
				throw new Error(`${this.constructor.name} doc _id:${this._id} was not modified`);
			}

			for(let [k, v] of Object.entries(data)) {
				this[k] = v;
			}

			return this;
		}).catch(e => {
			this.__updated = __updated;
			throw e;
		});
	}

	save(options) {
		if(!this._id) {
			// Mongo genrates _id. Since user does not use _id and it's reliable
			// we can use it to ensure consistency in our ops
			return this.constructor.collection.insertOne(this, options).then(({ insertedId }) => {
				this._id = insertedId;
				return this;
			});
		}

		return this.update({}, options);
	}

	delete(options) {
		return this.update({
			__deleted: Date.now()
		}, options);
	}

	hard_delete(options) {
		return this.constructor.collection.deleteOne({
			_id: this._id,
		}, options);
	}
}

Model.VALIDATION_SCHEMA = {};
Model.ALLOW_EXTRA_FIELDS = true;
Model.COLLECTION = null;
Model.DATABASE = undefined;

module.exports = Model;
