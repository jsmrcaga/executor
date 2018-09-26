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
		static all() {
			return this.collection().find({}).toArray();
		}

		/**
		 * Gets elements from the DB using Collection.find(selector)
		 * @param {Object} selector - Mongo selector
		 * @returns {Promise} Found objects or empty array
		 */
		static get(selector) {
			return this.collection().find(selector).toArray();
		}

		/**
		 * Gets elements from the DB using Collection.find(selector)
		 * @alias Model#get
		 */
		static find(selector) {
			return this.get(selector);
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
		static insertMany(objects) {
			return this.collection().insertMany(objects);
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
		 * Resolve a string query
		 * @param {string} query - A string query defined by the grammar
		 * @returns {Promise} Objects returned by the query
		 */
		static query(query) {
			
		}

		/**
		 * Returns related objects for this model instance
		 * @param {Class} model - Model of which to find related items 
		 * @param {string} [prop] - Property to use if different from this model's name
		 * @param {string} [myProp = 'id'] - Property to use from this object if different from 'id'
		 * @returns {Promise}
		 */
		related(model, prop, myProp = 'id') {
			if(!prop) {
				prop = name.toLowerCase();
			}

			return model.collection().find({
				[prop]: this[myProp]
			}).toArray();
		}

		/**
		 * Annotate this object with related objects
		 * @param {Object} related - Related params
		 * @param {string} [ownProp] - Property in which to store related objects
		 * @returns {Object} A shallow copy of this object (to prevent unvoluntary saves)
		 */
		annotate(model, ownProp, params = {}){
			if(!ownProp) {
				ownProp = model.name();
			}

			let {prop, myProp} = params;

			return this.related(model, prop, myProp).then(objects => {
				return Promise.resolve(Object.assign({}, this, {
					[ownProp]: objects
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
	}

	return new Proxy(Model, ModelProxy(db, name, Model));
}

module.exports = model_factory;
