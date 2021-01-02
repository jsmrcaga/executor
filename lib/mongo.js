const { prop_proxy } = require('./utils/utils');
const Database = require('./database');
const QueryString = require('querystring');
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
	constructor(params={}) {
		this.client = null;

		this.config(params);
		return new Proxy(this, MongoProxy);
	}

	config({ url=null, options, connection=null, database='' }={}) {
		this.url = url || this.url;
		this.connection_options = connection || this.connection_options;
		this.options = options || this.options;
		this.database = database || this.database || this.connection_options?.database;
	}

	get_connection_url() {
		if(!this.url && !this.connection_options) {
			throw new Error('Cannot get URL because no url nor connection options provided');
		}

		if(this.url) {
			return this.url;
		}

		const {
			protocol='mongodb',
			username='',
			password='',
			host,
			port= protocol === 'mongodb' ? 27017 : null,
			query=null,
			database=null
		} = this.connection_options;

		let auth = username || password ? `${username}:${password}@` : '';
		let portname = port ? `:${port}` : '';
		let querystring = query ? `?${QueryString.stringify(query)}` : '';
		let db = database ? `/${database}` : '';

		return `${protocol}://${auth}${host}${portname}${db}${querystring}`;
	}

	connect(options={}) {
		this.config(options);
		const url = this.get_connection_url();

		return MongoClient.connect(url, this.options).then(client => {
			this.client = client;
		});
	}

	disconnect() {
		if(!this.client.isConnected()) {
			throw new Error('Cannot disconnect non-connected DB');
		}

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
