const utils = require('../utils/utils');
const dbUtils = require('../utils/db');

const ModelProxy = require('../utils/modelProxy');

function model_factory(db, name, options) {
	let Collection = null;

	/**
	 * Object model for Mongo
	 */
	class Model {
		constructor() {
			this.id = utils.uuid();
			this.__deleted = false;
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
			return this.collection().find({
				__deleted: false
			}, options).toArray().then(objects => this.fromJSON(objects));
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

			return this.collection().find(selector, options).toArray()
				.then(objects => this.fromJSON(objects));
		}

		/**
		 * Gets elements from the DB using Collection.find(selector)
		 * @alias Model#get
		 */
		static find(selector, options) {
			return this.get(selector, options);
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
		static updateMany(objects) {
			for(let obj of objects) {
				if(!(obj instanceof this)){
					throw new Error('[MODEL] When updating many, be sure that all objects are instances of the same model');
				}
			}

			return dbUtils.updateMany(this.collection(), objects);
		}

		/**
		 * Deletes many objects from the collection
		 * @param {Object[]} objects - Objects to delete
		 * @returns {Promise}
		 */
		static delete(objects) {
			if(!(objects instanceof Array)) {
				objects = [objects];
			}

			return dbUtils.deleteMany(this.collection(), objects);
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
		 * Search an array property for the specified value
		 * @param {string} propName - Name of the property to look for
		 * @param {Object} value - Value to look for
		 * @returns {Promise} Objects matching the query
		 *
		 * @example
		 * let teslaUsers = await User.contains('cars', 'Tesla Model 3')
		 * let bananaMango = await User.contains('shopping', ['banana', 'mango']);
		 */
		static contains(propName, value) {
			if(!(value instanceof Array)){
				value = [value];
			}

			return this.get({
				[propName]: {
					$all: value
				},
				__deleted: false
			});
		}

		/**
		 * Returns related objects for this model instance
		 * @param {Class} model - Model of which to find related items 
		 * @param {string} [prop] - Property to use if different from this model's name
		 * @param {string} [myProp = 'id'] - Property to use from this object if different from 'id'
		 * @returns {Promise}
		 */
		related(model, prop, myProp = 'id', options={}) {
			if(!prop) {
				prop = name.toLowerCase();
			}

			return model.collection().find({
				[prop]: this[myProp],
				__deleted: false
			}, options).toArray().then(objects => model.fromJSON(objects));;
		}

		/**
		 * Annotate this object with related objects
		 * @param {Object} related - Related params
		 * @param {string} [ownProp] - Property in which to store related objects
		 * @returns {Promise<Object>} A shallow copy of this object (to prevent unvoluntary saves)
		 */
		annotate(model, ownProp, params = {}){
			if(!ownProp) {
				ownProp = model.name();
			}

			if(ownProp instanceof Object) {
				params = ownProp;
				ownProp = model.name();
			}

			let {prop, myProp} = params;

			return this.related(model, prop, myProp).then(objects => {
				let instances = model.fromJSON(objects);
				return Promise.resolve(Object.assign({}, this, {
					[ownProp]: instances
				}));
			});
		}

		/**
		 * Save this object to database
		 * @returns {Promise}
		 */
		save() {
			return dbUtils.update(db.__collection(name), this);
		}

		/**
		 * Delete this object
		 * @returns {Promise}
		 */
		delete() {
			return dbUtils.delete(db.__collection(name), this);
		}

		/**
		 * Remove an object from the database without deleting it
		 * @returns {Promise}
		 */
		remove() {
			this.__deleted = Date.now();
			return this.save();
		}
	}

	return new Proxy(Model, ModelProxy(db, name, Model));
}

module.exports = model_factory;
