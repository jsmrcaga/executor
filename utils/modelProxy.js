module.exports = (db, name, model) => {
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
