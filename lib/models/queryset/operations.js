class Operation {
	constructor(query={}) {
		this.query = query;
	}

	definition() {
		return this.query;
	}

	clone() {
		return new this.constructor(this.query);
	}
}

class LimitOperation extends Operation {
	constructor(qtty=1) {
		if(!Number.isInteger(qtty) || qtty < 0) {
			throw new Error(`Limit requires a positive integer, got ${typeof qtty}: ${qtty}`)
		}

		super(qtty);
	}

	definition() {
		return {
			$limit: this.query
		}
	}
}

// Generic class to validate input
class ObjectOperation extends Operation {
	constructor(query) {
		super(query);
		if(!(this.query instanceof Object)) {
			throw new Error(`${this.constructor.name} requires an object to execute. Got ${typeof this.query}`)
		}
	}
}

class FilterOperation extends ObjectOperation {
	constructor(query={}, position=null) {
		let forbidden = ['$where', '$near', '$nearSphere'];
		forbidden.forEach(param => {
			if(param in query) {
				throw new Error(`Cannot use ${param} expressions in Filter ($match) pipeline stage`);
			}
		});

		if(Number.isInteger(position) && ('$text' in query) && position > 0) {
			throw new Error(`To use $text expressions in Filter ($match) query, $match must be the first pipeline stage`);
		}

		super(query);
	}

	definition() {
		return {
			$match: this.query
		};
	}
}

class SelectRelatedOperation extends ObjectOperation {
	// performs aggregation
	constructor(query) {
		let schema = ['from', 'localField', 'foreignField', 'as'];
		schema.forEach(key => {
			if(!(key in query)) {
				throw new Error('SelectRelatedOperation ($lookup) needs a query of type { from, localField, foreignField, as }')
			}
		});
		super(query);
	}

	static build(Model, { as, localField, foreignField }) {
		let schema = {
			as,
			localField,
			foreignField,
			from: Model.collection_name,
		};

		return new this(schema);
	}

	definition() {
		return {
			$lookup: this.query
		}
	}
}

class AnnotationOperation extends ObjectOperation {
	definition() {
		return {
			$addFields: this.query
		}
	}
}

class GroupOperation extends ObjectOperation {
	constructor(query) {
		super(query);

		if(!('_id' in query)) {
			throw new Error('Group operation requires an _id field. To match all use null');
		}

		// Taken from https://docs.mongodb.com/manual/reference/operator/aggregation/group
		const valid_accumulators = [
			'$accumulator',
			'$addToSet',
			'$avg',
			'$first',
			'$first',
			'$last',
			'$last',
			'$max',
			'$mergeObjects',
			'$min',
			'$push',
			'$stdDevPop',
			'$stdDevSamp',
			'$sum'
		];

		Object.entries(query).forEach(([k, field]) => {
			if(k === '_id') {
				return;
			}

			for(let acc_key in field) {
				if(!valid_accumulators.includes(acc_key)) {
					throw new Error(`${acc_key} is not a valid group fields accumulator.` +
									'See https://docs.mongodb.com/manual/reference/operator/aggregation/group');
				}
			}
		});
	}


	definition() {
		return {
			$group: this.query
		}
	}
}

class ProjectOperation extends ObjectOperation {
	definition() {
		return {
			$project: this.query
		};
	}
}

class SortOperation extends ObjectOperation {
	definition() {
		return {
			$sort: this.query
		};
	}
}

module.exports = {
	Operation,
	FilterOperation,
	LimitOperation,
	SelectRelatedOperation,
	ObjectOperation,
	AnnotationOperation,
	GroupOperation,
	ProjectOperation,
	SortOperation
}
