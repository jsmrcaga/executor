const undefined_or_null = el => (el === undefined || el === null);

class GenericField {
	constructor({ required=false, defaultValue, nullable=false }={}) {
		this.required = required;
		this.defaultValue = defaultValue;
		this.nullable = nullable;
	}

	// Validate value when setting
	validate(value, values) {
		return true;
	}

	// Cast from DB to code
	cast(value) {
		return value;
	}

	get_default() {
		// null, 0, '' must be accepted
		if(this.defaultValue === undefined) {
			if(this.nullable) {
				return null;
			}
		}

		if(this.defaultValue instanceof Function) {
			return this.defaultValue();
		}

		return this.defaultValue;
	}

	is_valid(value, name, values={}) {
		if(value === null || value === undefined ) {
			if(this.nullable) {
				return true;
			}

			if(this.required) {
				throw new Error(`Required value "${name}"`);
			}

			return true;
		}

		let valid = this.validate(value, values);
		if(typeof valid === 'string') {
			throw new Error(valid);
		}

		if(!valid) {
			throw new Error(`Invalid value "${value}" for field "${name}" of type "${this.constructor.name}"`);
		}

		return true;
	}

	// Casts from DB
	cast_value(value) {
		if(value === null) {
			return null;
		}

		return this.cast(value);
	}

	// Casts model to database
	cast_to_db(value) {
		return value;
	}

	// Replaces a key if needed (foreign_key to foreign_key_id for example)
	replace_key(key) {
		return key;
	}
}

class DateTimeField extends GenericField {
	validate(value) {
		if(value instanceof Date) {
			if(Number.isNaN(value.getTime())) {
				throw new Error('Invalid date object. Consider passing strings to make debugging easier.');
			}
			return true;
		}

		if(typeof value !== 'string') {
			throw new Error('DateTime only accepts iso strings');
		}

		const tmp_date = new Date(value);
		if(Number.isNaN(tmp_date.getTime())) {
			throw new Error(`Invalid date: ${value}`);
		}

		return true;
	}

	cast(value) {
		return new Date(value);
	}
}

class StringField extends GenericField {
	constructor({ blank, choices=null, ...params } = {}) {
		super(params);
		this.blank = blank;
		this.choices = choices;
	}

	validate(value) {
		if(value === '')  {
			if(this.blank) {
				return true;
			}

			return false;
		}

		if(this.choices && !this.choices.includes(value)) {
			throw new Error(`Choices are: ${this.choices.join(', ')}`);
		}

		return typeof value === 'string';
	}

	cast(value) {
		return String(value);
	}
}

class NumberField extends GenericField {
	validate(value) {
		return !(value instanceof Object) && !Number.isNaN(value) && !Number.isNaN(Number(value));
	}

	cast(value) {
		return Number(value);
	}
}

class IntegerField extends NumberField {
	validate(value) {
		if(!super.validate(value)) {
			return false;
		}

		return Number.isInteger(value);
	}

	cast(value) {
		return parseInt(value);
	}
}

class PositiveIntegerField extends NumberField {
	constructor({ zero, ...params }={}) {
		super(params);
		this.zero = zero;
	}

	validate(value) {
		if(!super.validate(value)) {
			return false;
		}

		if(value === 0) {
			if(this.zero) {
				return true;
			}

			return 'Cannot be zero';
		}

		return value > 0;
	}
}

class BooleanField extends GenericField {
	validate(value) {
		return value === true || value === false;
	}

	cast(value) {
		return Boolean(value);
	}
}

class ObjectField extends GenericField {
	validate(value) {
		return value instanceof Object;
	}
}

class ArrayField extends GenericField {
	constructor({ of, empty=true, ...params }={}) {
		if(of && !(of instanceof GenericField)) {
			throw new Error('Of must be an instance of GenericField or be an inherited protoype');
		}

		super(params);
		this.of = of;
		this.empty = empty;
	}

	validate(value, name, values) {
		if(!Array.isArray(value)) {
			return false;
		}

		if(!this.empty && !value.length) {
			return 'Array cannot be empty';
		}

		if(this.of) {
			return value.every(item => this.of.is_valid(item, name, values));
		}

		return true;
	}
}

// Allows to generate objects when instanciating from DB
class ForeignKey extends GenericField {
	constructor({ Model, many=false, ...params }={}) {
		if(!Model) {
			throw new Error('ForeignKey field needs a model');
		}

		super(params);
		this.Model = Model;
		this.many = many;
	}

	is_valid(value, name, values={}) {
		if(this.many) {
			if((value === null || value === undefined )&& this.nullable) {
				return true;
			}

			if(!Array.isArray(value)) {
				throw new Error(`Foreign key field ${name} expects a list of ids, got "${typeof value}"`);
			}

			const all_same = new Set(value.map(item => typeof item));
			if(all_same.size !== 1) {
				throw new Error(`Multiple types found in array for foreign key field ${name}`);
			}

			const all_instances = value.every(item => item instanceof this.Model);
			if(all_instances) {
				return true;
			}

			return true;
		}

		const _id_field = `${name}_id`;

		const id_value = values[_id_field];
		const has_no_value = undefined_or_null(value) && undefined_or_null(id_value);

		if(has_no_value) {
			if(value === null || id_value === null && this.nullable) {
				return true;
			}

			if(this.required) {
				throw new Error('Required value');
			}
		}

		if(!undefined_or_null(value) && !(value instanceof this.Model)) {
			throw new Error(`Value ${value} is not an instance of ${this.Model.name}`);
		}

		// TODO: validate ID but it should be done on DB
		return true;
	}

	cast_one(val) {
		if(!val) {
			return null;
		}
		// Assert that val is actually a document
		if(!(val instanceof Object) && !this.many) {
			throw new Error('ForeignKey field needs a model');
		}

		return this.Model.create(val);
	}

	cast(val) {
		if(this.many) {
			return val.map(v => this.cast_one(v));
		}

		// If lookup returns an array, even if its for 1 element
		if(Array.isArray(val)) {
			return this.cast_one(val[0]);
		}

		return this.cast_one(val);
	}

	cast_one_to_db(value) {
		if(value instanceof this.Model) {
			// get pk and return that
			return value.pk;
		}

		return value;
	}

	cast_to_db(value) {
		if(this.many) {
			return value.map(v => this.cast_one_to_db(v));
		}

		return this.cast_one_to_db(value);
	}

	replace_key(key) {
		const postfix = this.many ? '_ids' : '_id';

		if(new RegExp(`${postfix}$`).test(key)) {
			return key;
		}

		return `${key}${postfix}`;
	}
}

// Represents a PK on a model, only used to compare instances
class PrimaryKey extends GenericField {}

// Validate a single field from a model
function validate_field(object, field_name, value, values) {
	const schema = object.constructor.VALIDATION_SCHEMA || {};
	const allow_extra = object.constructor.ALLOW_EXTRA_FIELDS;

	if(!(field_name in schema)) {
		if(!allow_extra && field_name !== '_id') {
			throw new Error(`${object.constructor.name} does not accept extra fields. "${field_name}" is not a valid field.`);
		}

		return true;
	}

	const field = schema[field_name];
	return field.is_valid(value, field_name, values);
}

// Validate all fields when creating a model
function validate(object, values, { partial=false }={}) {
	const data_validated = [];

	// 2 steps
	// 1/ validate provided data
	// 2/ validate remaining from schema if needed (required etc)

	// Validate all entries in data
	Object.entries(values).forEach(([field_name, value]) => {
		validate_field(object, field_name, value, values);
		data_validated.push(field_name);
	});

	if(!partial) {
		// Validate remaining schema keys
		Object.entries(object.constructor.VALIDATION_SCHEMA).forEach(([field_name, field]) => {
			if(data_validated.includes(field_name)) {
				return;
			}

			field.is_valid(values[field_name], field_name, values);
		});
	}
}

function find_pk(schema) {
	let pks = Object.entries(schema).filter(([k, v]) => {
		return v instanceof PrimaryKey;
	});

	if (pks.length > 1) {
		throw new Error('Cannot define multiple pks');
	}

	if(!pks.length) {
		return ['_id', null];
	}

	// [pk_key, pk_field];
	return pks[0];
}

// Get a model PK field
function get_pk(object, values) {
	const schema = object.constructor.VALIDATION_SCHEMA;
	const found_pk = find_pk(schema);

	// Returns default _id
	let [key, pk] = found_pk

	if(!(key in values)) {
		return {
			pk: pk ? pk.get_default() : null,
			key
		};
	}

	return {
		pk: values[key],
		key
	};
}

// To use when creating objects from DB
function populate(Model, values={}) {
	const schema = Model.VALIDATION_SCHEMA;

	if(!schema) {
		return values;
	}

	let result = {};
	for(let [key, value] of Object.entries(values)) {
		if(key in schema) {
			const field = schema[key];
			// Cast value actually creates model values
			value = field.cast_value(value);
		}

		// TODO
		// Instanciate reverse models

		// No need to check for "allow extra" since
		// value is already on DB
		result[key] = value;
	}

	return result;
}

function fillup(Model, values={}) {
	const schema = Model.VALIDATION_SCHEMA;

	if(!schema) {
		return values;
	}

	const result_keys = Object.keys(values);
	const missing_keys = Object.keys(schema).filter(k => !result_keys.includes(k));

	for(let k of missing_keys) {
		if(schema[k] instanceof PrimaryKey) {
			continue;
		}

		if(schema[k].defaultValue !== undefined){
			values[k] = schema[k].get_default();
		}
	}

	return values;
}

function to_db(model) {
	const { VALIDATION_SCHEMA={} } = model.constructor;

	const obj = {};
	const keys = Object.getOwnPropertyNames(model);
	for(const k of keys) {
		const field = VALIDATION_SCHEMA[k];

		if(field) {
			const key = field.replace_key(k);
			obj[key] = field.cast_to_db(model[k]);
		} else {
			obj[k] = model[k];
		}
	}

	return obj;
}

module.exports = {
	validate_field,
	validate,
	pk: find_pk,
	get_pk,
	to_db,
	populate,
	fillup,
	GenericField,
	String: StringField,
	Number: NumberField,
	Integer: IntegerField,
	PositiveInteger: PositiveIntegerField,
	Boolean: BooleanField,
	Object: ObjectField,
	Array: ArrayField,
	ForeignKey,
	PrimaryKey,
	DateTime: DateTimeField
};
