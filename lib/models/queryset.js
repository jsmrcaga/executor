const Fields = require('./fields');
const Cursor = require('./cursor');
const Operations = require('./queryset/operations');

class DoesNotExist extends Error {}
class MoreThanOneExist extends Error {}

class AggregationQuerySet {
	constructor({ Model, pipeline=[] }) {
		this.Model = Model;
		this.pipeline = pipeline;
	}

	get collection() {
		return this.Model.collection;
	}

	clone() {
		const pipeline = [...this.pipeline];
		const clone = new this.constructor({
			Model: this.Model,
			pipeline: this.pipeline.map(op => op.clone())
		});
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

		const db_ready = objects.map(object => object.toDataBase());

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

	get_aggregation_filter() {
		const filters = this.pipeline.filter(op => op instanceof Operations.FilterOperation);

		return filters.reduce((agg, { query }) => {
			agg = {
				...agg,
				...query
			};

			return agg;
		}, { });
	}

	update(query, options={}) {
		// Execute queryset and update docs from raw cursor
		const filters = this.get_aggregation_filter();
		return this.collection.updateMany(filters, {
			$set: query
		}, options);
	}

	get(query=null) {
		if(query) {
			this.filter(query);
		}

		return this.execute().then(docs => {
			if(!docs.length) {
				throw new DoesNotExist(`No document matching query for ${this.Model.name}!`);
			}

			if(docs.length > 1) {
				throw new MoreThanOneExist('More than one document matching query!');	
			}

			return docs[0];
		});
	}

	// Delete full queryset
	delete(options={}) {
		// Execute queryset and delete all elements in it
		return this.update({
			__deleted: (new Date()).toISOString()
		}, options);
	}

	hard_delete(options={}) {
		const filters = this.get_aggregation_filter();
		return this.collection.deleteMany(filters, options);
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

	select_related(...keys) {
		for(const k of keys) {
			this.select_one_related(k);
		}

		return this;
	}

	select_one_related(key) {
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
			localField: field.replace_key(key),
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

	all() {
		return this.filter({});
	}

	sort(query) {
		return this.operation(new Operations.SortOperation(query));
	}

	count(name='count') {
		const queryset = this.raw({ $count: name });
		const aggregation_cursor = queryset.run();
		return aggregation_cursor.next().then(result => {
			// if no document matches result will be null, so we can fake it to 0
			return result?.[name] || 0;
		});
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

AggregationQuerySet.DoesNotExist = DoesNotExist;
AggregationQuerySet.MoreThanOneExist = MoreThanOneExist;

module.exports = AggregationQuerySet;
