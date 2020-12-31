const Fields = require('./fields');
const Cursor = require('./cursor');
const Operations = require('./queryset/operations');

class AggregationQuerySet {
	constructor({ Model }) {
		this.Model = Model;
		this.pipeline = [];
	}

	get collection() {
		return this.Model.collection;
	}

	clone() {
		const clone = new this.constructor({ Model: this.Model });
		clone.pipeline = [...this.pipeline];
		return clone;
	}

	active(selector={}) {
		if(selector.__deleted === undefined){
			selector.__deleted = null;
		}

		return this.filter(selector);
	}

	// NORMAL METHODS
	// Create one object
	create(params) {
		let object = new this.Model(params);
		return object.save();
	}

	bulk_insert(objects, options) {
		if(!Array.isArray(objects)) {
			throw new Error(`bulk_insert expects an array of ${this.Model.name} objects`);
		}

		if(objects.some(object => !(object instanceof this.Model))) {
			throw new Error(`Can only insert instances of ${this.Model.name}`);
		}

		return this.collection.insertMany(objects, options).then((result) => {
			let { insertedCount } = result;
			if(insertedCount !== objects.length) {
				throw new Error(`Some objects were not inserted (${insertedCount}/${objects.length})`);
			}

			return result;
		});
	}

	bulk_update(filter, updates, options) {
		throw new Error('Not implemented');
	}

	// Maps aggregation cursor using next()
	// Expects every element to have an _id
	// Which will be used in the queryset model
	map_ids(acc=[], cursor) {
		// Aggregation cursor
		if(!cursor) {
			cursor = this.run();
		}

		return cursor.next(el => {
			if(el === null) {
				return acc;
			}

			if(!('_id' in el)) {
				throw new Error(`Aggregation result does not include Model primary key ${pk_key}`);
			}

			acc.push(el._id);
			return this.map_ids(acc, cursor);
		});
	}

	get_aggregation_ids() {
		return this.map_ids().then(ids => {
			return {
				_id: {
					$in: ids
				}
			}
		});
	}

	update(query, options={}) {
		// Execute queryset and update docs from raw cursor
		this.get_aggregation_ids().then(ids_filter => {
			return this.collection.updateMany(ids_filter, {
				$set: query
			}, options);
		});
	}

	get(query=null) {
		if(query) {
			this.filter(query);
		}

		return this.execute().then(docs => {
			if(!docs.length) {
				throw new Error('No document matching query!');
			}

			if(docs.length > 1) {
				throw new Error('More than one document matching query!');	
			}

			return docs[0];
		});
	}

	// Delete full queryset
	delete(options={}) {
		// Execute queryset and delete all elements in it
		return this.update({
			__deleted: Date.now()
		}, options);
	}

	hard_delete(options={}) {
		return this.get_aggregation_ids().then(ids_filter => {
			return this.collection.deleteMany(ids_filter, options);
		});
	}

	// AGGREGATION METHODS
	raw(query) {
		this.pipeline.push(new Operations.Operation(query));
		return this;
	}

	operation(operation) {
		if(!(operation instanceof Operations.Operation)) {
			throw new Error('Cannot call "operation" without instances of Operation. Use AggregationQuerySet.raw to pass raw aggregation pipeline stages');
		}

		this.pipeline.push(operation);
		return this;
	}

	lookup(query) {
		let lookup = new Operations.SelectRelatedOperation(query);
		return this.operation(lookup);
	}

	reverse_related(RelatedModel) {
		const Model = require('./model');
		if(!(RelatedModel.prototype instanceof Model)) {
			throw new Error(`RelatedModel must be an instance of Model. Got ${typeof RelatedModel}`);
		}

		const underscore_name = (string) => string.replace(/-/g, '_');
		// Will add a "first" transform as well in order
		// to only get the linked object and not an array
		let [model_pk_key] = Fields.pk(this.Model.VALIDATION_SCHEMA);

		let lookup = Operations.SelectRelatedOperation.build(RelatedModel, {
			as: `${underscore_name(RelatedModel.collection_name)}s`,
			localField: model_pk_key,
			foreignField: `${underscore_name(this.Model.collection_name)}_id`
		});

		return this.operation(lookup);
	}

	select_related(key) {
		const Model = require('./model');
		let reversed = (key.prototype && key.prototype instanceof Model);

		if(reversed) {
			return this.reverse_related(key);
		}

		// Performs some magic
		// get related_name
		// get local_field (from key)
		// get foreign_field
		if(!(key in this.Model.VALIDATION_SCHEMA)) {
			throw new Error(`"${key}" is not defined in validation schema for ${this.Model.name}. Cannot select related objects`);
		}

		let field = this.Model.VALIDATION_SCHEMA[key];
		if(!(field instanceof Fields.ForeignKey)) {
			throw new Error(`"${key}" is not a foreign key field`);
		}

		let foreign_model = field.Model;
		let [foreign_pk_key] = Fields.pk(foreign_model.VALIDATION_SCHEMA);

		let lookup = Operations.SelectRelatedOperation.build(foreign_model, {
			as: key,
			localField: `${key}_id`,
			foreignField: foreign_pk_key
		});

		// Add lookup to join collections
		return this.operation(lookup);
	}

	limit(qtty) {
		return this.operation(new Operations.LimitOperation(qtty));
	}

	project(projection) {
		return this.operation(new Operations.ProjectOperation(projection));
	}

	values(...args) {
		// Special project
		let projection = args.reduce((p, val) => {
			p[val] = 1;
			return p;
		}, {});

		return this.project(projection);
	}

	annotate(query) {
		return this.operation(new Operations.AnnotationOperation(query));
	}

	group(query) {
		return this.operation(new Operations.GroupOperation(query));
	}

	filter(query) {
		return this.operation(new Operations.FilterOperation(query, this.pipeline.length));
	}

	sort(query) {
		return this.operation(new Operations.SortOperation(query));
	}

	// Get aggregation pipeline stages
	chain() {
		return this.pipeline.map(op => op.definition());
	}

	explain() {
		let ret = this.pipeline.map(op => {
			return `${op.constructor.name}\n\n${JSON.stringify(op.definition(), null, 4)}\n\n\n`;
		});
		console.log(ret.join(''));
		return this;
	}

	run(options={}) {
		let aggregation = this.chain();
		return this.collection.aggregate(aggregation, options);
	}

	aggregation_cursor(options={}) {
		return this.run(options);
	}

	// Execute queryset
	execute(options={}) {
		// Get operations and whatever we have to do
		let cursor = this.run(options);
		let inner_cursor = new Cursor({
			cursor,
			Model: this.Model
		});

		return inner_cursor.execute();
	}

	done(options={}) {
		return this.execute(options);
	}
}

module.exports = AggregationQuerySet;
