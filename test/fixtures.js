const Mongo = require('../lib/mongo');

module.exports = {
	connect: () => {
		let result = {
			db: null
		};

		// Create connection and push DB to object for tests to use
		beforeEach(done => {
			Mongo.connect({
				// url: `mongodb://mongo-db:27017/mongo?replicaSet=mongoset&readPreference=primary&connect=direct`,
				url: `mongodb://db:27017/mongo?replicaSet=mongoset&directConnection=true`,
				options: {
					useUnifiedTopology: true,
				},
				database: 'mongo'
			}).then(() => {
				result.db = Mongo.db();
				done();
			}).catch(e => {
				done(e);
			});
		});

		// Disconnect client
		afterEach(done => {
			result.db.clear().then(() => {
				return Mongo.disconnect();	
			}).then(() => done()).catch(e => done(e));
		});

		return result;
	}
}
