const { prop_proxy } = require('./utils/utils');
const Database = require('./database');
const { MongoClient } = require('mongodb');

const MongoProxy = {
	get: (obj, prop) => {
		if(prop in obj) {
			return prop_proxy(obj, prop);
		}

		let { client } = obj;
		return prop_proxy(client, prop);
	}
};

class Mongo {
	constructor() {
		this.client = null;
		this.database = null;
		this.url = null;
		return new Proxy(this, MongoProxy);
	}

	init({ url, database, options={} }) {
		if(!url) {
			throw new Error('url is mandatory');
		}

		this.database = database;
		this.client = new MongoClient(url, options);
		return this;
	}

	connect({ url, database, options={} }={}) {
		if(!this.client) {
			this.init({ url, database, options });
		}

		return this.client.connect();
	}

	disconnect() {
		return this.client.close();
	}

	db(name) {
		if(!name && !this.database) {
			throw new Error('Cannot create db without name. Pass as config or as parameter');
		}

		if(!this.client) {
			throw new Error('Cannot get a db without being connected. Please call connect() first');
		}

		let db = this.client.db(name || this.database);
		return new Database({ db, mongo: this });
	}
}


const mongo = new Mongo();
module.exports = mongo;
