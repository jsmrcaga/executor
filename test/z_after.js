const {db} = require('../utils/test');

const database = db();

after(done => {
	database.connect().then(() => {
		return database.clear();
	}).then(() => {
		done();
	}).catch(e => {
		done(e);
	});
});
