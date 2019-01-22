const Mongo = require('mongodb').MongoClient;
const model = require('./model');

/**
 * A Database client
 */
class Database {
	/**
	 * @constructor
	 * @param {string} name - The name of your database
	 * @param {Object} options - The options of your database
	 * @param {string} options.protocol - Protocol to be used
	 * @param {string} options.username - Username use when connecting
	 * @param {string} options.password - Password to use when connecting
	 * @param {string} options.database - Database to load from Mongo
	 */
	constructor(name, options) {
		this.name = name;
		this.options = options;

		this.__connected = false;
		this.__mongo = null;
		this.__client = null;
	}

	/**
	 * Is the database connected ? 
	 * @returns {bool}
	 */
	connected() {
		return this.__connected;
	}

	/**
	 * Creates a Model Class with given name and options
	 * @param {string} name - Name of the model (will be the name of the collection in lowercase)
	 * @param {Object} options - Options for the model
	 * @returns {Function} model Class ready to be instanciated
	 */
	model(name, options) {
		return model(this, name, options);
	}

	/**
	 * Connects the database to mongoDB
	 * @returns {Promise} Promise resolving on connect, rejecting on error
	 */
	connect(options = {}) {
		let {protocol, endpoint, username, password, port, database, timeout, ...other_options} = this.options || options;
		if(!username || !password) {
			throw new Error('[DB] Username & password required to connect');
		}

		if(!endpoint || !database) {
			throw new Error('[DB] Endpoint and Database required to connect');
		}

		let connection_options = {
			useNewUrlParser: true,
			connectTimeoutMS: timeout || 5000,
			...other_options
		};

		let connection_url = `${protocol || 'mongodb'}://${username}:${password}@${endpoint}${protocol
			? (protocol.indexOf('srv')>-1 ? '' : `:${port || 25368}`)
			: `:${port || 25368}`}/${database}`;

		return Mongo.connect(connection_url, connection_options).then(client => {
			this.__connected = true;
			this.__mongo = client;
			this.__client = client.db(database);

			this.__client.on('close', () => {
				this.__connected = false;
			});

			this.__client.on('error', e => {
				console.error('[DB][CONNECTION] Error event', e);
			});

			if(this.__events) {
				for(let event of this.__events) {
					this.__client.on(event.event, event.callback);
				}

				delete this.__events;
			}

			return client;

		}).catch(e => {
			console.error('[DB][CONNECTION] DB could not connect', e);
			throw e;
		});
	}

	on(event, callback) {
		if(!this.connected()) {
			if(!this.__events) { this.__events = []; }
			this.__events.push({event, callback});
			return this;
		}

		this.__client.on(event, callback);
	}

	/**
	 * Clears the database dropping collections one by one
	 * @returns {Promise}
	 */
	clear() {
		return this.__client.collections().then(collections => {
			let p = [];
			for(let col of collections) {
				let { name } = col.s;

				if(!(/^system\./.test(name))) {
					p.push(this.__client.dropCollection(name));
				}
			}

			return Promise.all(p);

		}).catch(e => {
			console.error('[DB][CLEAR Could not clear database', e);
			throw e;
		});
	}

	/**
	 * Disconnects from the database
	 * @returns {Promise}
	 */
	disconnect() {
		if(!this.connected() || !this.__mongo) {
			let e = new Error('[DB] Cannot close connection with a disconnected database, use Database.connect');
			return Promise.reject(e);
		}

		return this.__mongo.close().then(() => {}).catch(e => {
			console.error('[DB][DISCONNECT] Cannot close the connection', e);
			throw e;
		});
	}

	__collection(model) {
		return this.__client.collection(model.toLowerCase());
	}
}

module.exports = Database;
