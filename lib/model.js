const Cursor = require('./cursor');

const uuid = () => {
	function gen4() {
		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
	return gen4() + gen4() + '-' + gen4() + '-' + gen4() + '-' + gen4() + '-' + gen4() + gen4() + gen4();
};

/**
 * Proxy model to use collection methods if needed
 */
const ModelProxy = (db, name, model) => {
	let ownProps = Object.getOwnPropertyNames(model);
	
	return {
		get: (obj, prop) => {
			if(ownProps.indexOf(prop) > -1 || obj[prop]) {
				return obj[prop];
			}

			let col = db.__collection(name);
			if(col[prop]) {
				return col[prop];
			}
		}
	};
};

function model_factory(db, name) {
	// Cache collection
	let Collection = null;

	/**
	 * Object model for Mongo
	 */
	class Model {
		constructor() {
			this.id = uuid();

			// Will be overwritten each time we load
			this.__created = Date.now();
			this.__deleted = false;
			this.__updated = false;
		}

		/**
		 * Instanciate objects from JSON instances
		 * @returns {Object[]} Instances
		 */
		static fromJSON(objects = []) {
			return objects.map(object => {
				let instance = null;

				switch(this.length) {
					case 0:
						instance = new this();
						break;
					case 1:
						instance = new this(object);
						break;
					default:
						instance = new this();
				}

				for(let k in object){
					instance[k] = object[k];
				}
				return instance;
			});
		}

		/**
		 * Returns the name of the model
		 * @returns {string} The name of the model
		 */
		static name() {
			return name.toLowerCase();
		}

		/**
		 * Returns all objects from the DB
		 */
		static all(options = {}) {
			return this.find({
				__deleted: {
					$exists: true
				}
			}, options);
		}

		/**
		 * Gets elements from the DB using Collection.find(selector)
		 * @param {Object} selector - Mongo selector
		 * @returns {Promise} Found objects or empty array
		 */
		static get(selector={}, options={}) {
			if(selector.__deleted === undefined){
				selector.__deleted = false;
			}

			let cursor = this.filter(selector, options);
			return cursor.count().then(count => {
				if(count > 1) {
					throw new Error(`[MODEL] ${name}.get() returned more than one objet, it returned ${count}`);
				}

				return cursor.execute();
			}).then(objects => {
				return objects[0];
			});
		}

		/**
		 * Gets elements from the DB using Collection.find(selector)
		 * @alias Model#get
		 */
		static find(selector={}, options) {
			if(selector.__deleted === undefined){
				selector.__deleted = false;
			}

			return this.filter(selector, options);
		}

		/**
		 * Filters elements and returns a cursor
		 */
		static filter(selector, options) {
			let cursor = this.collection().find(selector, options);
			return new Cursor({ cursor, model: this});
		}

		/**
		 * Returns the Mongo collection for this model
		 * @returns {Mongo.Collection} Collection for this model
		 */
		static collection() {
			if(!db.connected()){
				throw new Error('[MODEL] Cannot query disconnected DB');
			}

			if(!Collection) {
				Collection = db.__collection(name);
			}

			// cache Collection to improve perf
			return Collection;
		}

		/**
		 * Insert many objects into the model collection
		 * @param {Object[]} objects - Objects to insert
		 */
		static insertMany(objects, options={}) {
			return this.collection().insertMany(objects, options);
		}

		/**
		 * Updates many instances of the documents
		 * @param {Object[]} objects - Objects to update
		 * @returns {Promise}
		 */
		static updateMany(objects, update={}, options = {}) {
			for(let obj of objects) {
				if(!(obj instanceof this)){
					throw new Error('[MODEL] When updating many, be sure that all objects are instances of the same model');
				}
			}

			let filter = {
				id: {
					$in: objects.map(o => o.id)
				}
			};

			return this.collection().updateMany(filter, update, options);
		}

		/**
		 * Deletes many objects from the collection
		 * @param {Object[]} objects - Objects to delete
		 * @returns {Promise}
		 */
		static delete(objects, options = {}) {
			if(!(objects instanceof Array)) {
				objects = [objects];
			}

			let filter = {
				id: {
					$in: objects.map(o => o.id)
				}
			};

			let update = {
				$set: {
					__deleted: Date.now()
				}
			};

			return this.collection().updateMany(filter, update, options);
		}

		static deleteMany(...args) {
			return this.delete(...args);
		}

		/**
		 * Resolve a string query
		 * @param {string} query - A string query defined by the grammar
		 * @returns {Promise} Objects returned by the query
		 */
		static query(query) {
			throw new Error('[MODEL] Query strings not supported yet');
		}


		/**
		 * Allows the creation of a single index
		 */
		static createIndex(index, options={}) {
			return this.createIndexes([index], options);
		}

		/**
		 * Allows the creation of indexes on the collection
		 * @see https://docs.mongodb.com/manual/reference/method/db.collection.createIndex/#db-collection-createindex
		 * @param {Obejct} indexes - Indexes options from mongo documentation
		 */
		static createIndexes(indexes, options={}) {
			if(!(options instanceof Array) && options.bulk) {
				delete options.bulk;
				return this.collection().createIndexes(indexes, options);
			}

			let collection = this.collection();
			
			let promises = indexes.map((index, i) => {
				let opts = options instanceof Array ? options[i] : options;
				if(index.options) {
					opts = index.options;
					delete index.options;
				}

				let indx = index;
				if(index.key && index.key instanceof Object) {
					indx = index.key;
				}

				return collection.createIndex(indx, opts);
			});

			return Promise.all(promises);
		}

		/**
		 * Update the model with new data
		 * Note that this is only a utility method and makes references, not copies
		 * @param {Object} data - New data to apply to the object's top-leve
		 */
		update(data={}) {
			if(!(data instanceof Object)) {
				throw new Error('[MODEL] Updating model requires an object');
			}

			for(let k in data) {
				this[k] = data[k];
			}

			return this;
		}

		/**
		 * Save this object to database
		 * @returns {Promise}
		 */
		save(options = {}) {
			// Last update date
			this.__updated = Date.now();

			let collection = this.constructor.collection();
			let replacer = { id: this.id };

			if(!this._id){
				return collection.insertOne(this, options).then(() => this);
			}

			return collection.findOneAndReplace(replacer, this, options).then(res => {
				if(res.lastErrorObject && !res.lastErrorObject.updatedExisting) {
					return collection.insertOne(this, options).then(() => this);
				}

				return this;
			});
		}

		/**
		 * Delete this object
		 * @returns {Promise}
		 */
		delete(options = {}) {
			return this.constructor.deleteMany([this], options);
		}

		/**
		 * Remove an object from the database without deleting it
		 * @returns {Promise}
		 */
		remove(options = {}) {
			this.__deleted = Date.now();
			return this.save(options);
		}
	}

	return new Proxy(Model, ModelProxy(db, name, Model));
}

module.exports = model_factory;
