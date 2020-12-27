module.exports = {
	prop_proxy: (object, prop) => {
		if(object && prop in object) {
			let result = object[prop];
			if(result instanceof Function) {
				return result.bind(object);
			}
			return result;
		}
	}
}
