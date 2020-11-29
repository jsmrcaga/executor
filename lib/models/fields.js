class GenericField {
	constructor({ required, defaultValue, nullable }={}) {
		this.required = required;
		this.defaultValue = defaultValue;
		this.nullable = nullable;
	}

	validate(value) {
		return true;
	}

	cast(value) {
		return value;
	}

	get_default() {
		if(this.defaultValue instanceof Function) {
			return this.defaultValue();
		}

		return this.defaultValue;
	}

	is_valid(value) {
		if(value === null || value === undefined ) {
			if(this.nullable && value === null) {
				return true;
			}

			if(this.required) {
				throw new Error('Required value');
			}
		}

		let valid = this.validate(value);
		if(typeof valid === 'string') {
			throw new Error(valid);
		}

		if(!valid) {
			throw new Error(`Invalid value "${value}" for field "${this.constructor.name}"`);
		}

		return true;
	}
}

class StringField extends GenericField {
	constructor({ blank, ...params } = {}) {
		super(params);
		this.blank = blank;
	}

	validate(value) {
		if(value === '')  {
			if(this.blank) {
				return true;
			}

			return false;
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
			console.log('OF is', of);
			throw new Error('Of must be an instance of GenericField or be an inherited protoype');
		}

		super(params);
		this.of = of;
		this.empty = empty;
	}

	validate(value) {
		if(!Array.isArray(value)) {
			return false;
		}

		if(!this.empty && !value.length) {
			return 'Array cannot be empty';
		}

		if(this.of) {
			return value.every(item => this.of.is_valid(item));
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

	validate(value) {
		if(!(value instanceof this.Model)) {
			return `Value is not an instance of ${this.Model.name}`;
		}

		return true;
	}

	cast(val) {
		if(!val) {
			return null;
		}
		// Assert that val is actually a document
		if(!(val instanceof Object)) {
			throw new Error('ForeignKey field needs a model');
		}

		if(!this.many) {
			return this.Model.create(val[0]);
		}

		return val.map(v => this.Model.create(v));
	}
}

// Represents a PK on a model, only used to compare instances
class PrimaryKey extends GenericField {}

// Validate a single field from a model
function validate_field(object, field_name, value) {
	const schema = object.constructor.VALIDATION_SCHEMA;
	const allow_extra = object.constructor.ALLOW_EXTRA_FIELDS;

	if(!(field_name in schema)) {
		if(!allow_extra) {
			throw new Error(`${object.constructor.name} does not accept extra fields. "${prop}" is not a valid field.`);
		}

		return true;
	}

	const field = schema[field_name];
	return field.is_valid(value);
}

// Validate all fields when creating a model
function validate(object, values) {
	Object.entries(values).forEach(([field_name, value]) => {
		validate_field(object, field_name, value);
	});
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

	let result = {};
	for(let [key, value] of Object.entries(values)) {
		if(key in schema) {
			let field = schema[key];
			value = field.cast(value);
		}

		// TODO
		// Instanciate reverse models

		// No need to check for "allow extra" since
		// value is already on DB
		result[key] = value;
	}

	return result;
}

module.exports = {
	validate_field,
	validate,
	pk: find_pk,
	get_pk,
	populate,
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
};
