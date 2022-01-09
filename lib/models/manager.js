const AggregationQuerySet = require('./queryset');
const CursorProxy = require('./cursor');
const { AbstractCursor } = require('mongodb');

const FunctionProxy = (Model, collection) => {
	return {
		apply: (func, thisArg, args) => {
			// We could also call func(...args)
			// but i'm scared for thisArg and its 11:30PM
			let result = func.apply(collection, args);
			if(result instanceof AbstractCursor) {
				return new CursorProxy({
					cursor: result,
					Model
				});
			}

			return result;
		}
	};
}

const ManagerProxy = (Model) => {
	return {
		get: (obj, prop) => {
			// Call manager props
			if(prop in obj) {
				return obj[prop];
			}

			// Call queryset methods before collection in case of
			// collision
			let queryset = obj.aggregation_queryset();
			if(prop in queryset) {
				let result = queryset[prop];
				if(result instanceof Function) {
					return result.bind(queryset);
				}
				return result;
			}

			// Call collection props
			let collection = Model.collection;
			if(prop in collection) {
				let result = collection[prop];
				if(result instanceof Function) {
					return new Proxy(result, FunctionProxy(Model, collection));
				}

				return result;
			}
		}
	}
};

class Manager {
	constructor(Model, Queryset=AggregationQuerySet) {
		if(!Model) {
			throw new Error('Cannot create Manager without Model');
		}

		this.Model = Model;
		this.Queryset = Queryset;

		return new Proxy(this, ManagerProxy(Model));
	}

	aggregation_queryset() {
		const { Queryset, Model } = this;
		return new Queryset({ Model });
	}
}

module.exports = Manager;
