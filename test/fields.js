const { expect } = require('chai');

const Model = require('../lib/models/model');
const Fields = require('../lib/models/fields');

const fixtures = require('./fixtures');

// Setup
class NeverValidatesField extends Fields.GenericField {
	constructor(params) {
		super(params);
	}

	validate() {
		return this.value;
	}
}

class ModelA extends Model{}

class ValidationModel extends Model{}
ValidationModel.VALIDATION_SCHEMA = {
	name: new Fields.String({ required: true, blank: false }),
};

describe('Fields', () => {
	describe('Generic', () => {
		it('is_valid - Validates required field', () => {
			let field = new Fields.GenericField({ required: true });
			expect(() => field.is_valid(null)).to.throw(Error, 'Required value');
			expect(() => field.is_valid()).to.throw(Error, 'Required value');
			let values = ['plep', 5, {}, [], true, new Date()];
			for(let value of values) {
				expect(field.is_valid(value)).to.be.true;
			}
		});

		it('is_valid - Validates using valid() & throws', () => {
			let string_field = new NeverValidatesField({ required: true });
			let false_field = new NeverValidatesField({ required: true });

			expect(() => string_field.is_valid('My error')).to.throw(Error);
			expect(() => string_field.is_valid('My error')).to.throw(Error, 'My error');

			expect(() => false_field.is_valid(false)).to.throw(Error);
			expect(() => false_field.is_valid(false)).to.throw(Error, 'Invalid value');
		});

		it('get_default - Gets a default value (func / value)', () => {
			let value_field = new Fields.GenericField({ defaultValue: 25 });
			let fun_field = new Fields.GenericField({ defaultValue: () => 46 });

			expect(value_field.get_default()).to.be.eql(25);
			expect(fun_field.get_default()).to.be.eql(46);
		});

		it('validate - Validates fields for given Model', () => {
			expect(() => {
				new ValidationModel();
			}).to.throw(Error, 'Required value');
		});
	});

	describe('String Field', () => {
		let field = new Fields.String({ blank: false });
		it('Fails validation because not string', () => {
			let not_strings = [5, 5.123, 1e3, true, {}, [], new Date()];
			for(let ns of not_strings) {
				expect(field.validate(ns)).to.be.eql(false);
			}
		});

		it('Validates strings correctly', () => {
			expect(field.validate('')).to.be.false;
			expect(field.validate('plep')).to.be.true;
			expect(field.validate(String(26))).to.be.true;
		});

		it('Validates blank strings correctly', () => {
			let field = new Fields.String({ blank: true });
			expect(field.validate('')).to.be.true;
		});

		it('Casts strings correctly', () => {
			expect(field.cast('')).to.be.eql('');
			expect(field.cast('plep')).to.be.eql('plep');
			expect(field.cast('plep\'\"\n')).to.be.eql('plep\'\"\n');
			expect(field.cast(5)).to.be.eql('5');
			expect(field.cast(5.123456789)).to.be.eql('5.123456789');
			expect(field.cast({})).to.be.eql('[object Object]');
		});
	});

	describe('Numbers', () => {
		describe('Number field', () => {
			let field = new Fields.Number();

			it('Validates numbers', () => {
				expect(field.validate('5')).to.be.true;
				expect(field.validate('5.1235')).to.be.true;
				expect(field.validate(45)).to.be.true;
				expect(field.validate(0)).to.be.true;
				expect(field.validate(46.12345)).to.be.true;
				expect(field.validate(-31)).to.be.true;
				expect(field.validate('5plep')).to.be.false;
				expect(field.validate({})).to.be.false;
				expect(field.validate([])).to.be.false;
				expect(field.validate(new Date())).to.be.false;
			});

			it('Casts numbers', () => {
				expect(field.cast('5')).to.be.eql(5);
				expect(field.cast('5.123456789')).to.be.eql(5.123456789);
			});
		});

		describe('Integer field', () => {
			let field = new Fields.Integer();

			it('Validates integers', () => {
				expect(field.validate(5)).to.be.true;
				expect(field.validate('56')).to.be.false;
				expect(field.validate(3.14)).to.be.false;
				expect(field.validate('3.14')).to.be.false;
			});

			it('Casts integers', () => {
				expect(field.cast(5)).to.be.eql(5);
				expect(field.cast('56')).to.be.eql(56);
				expect(field.cast(3.14)).to.be.eql(3);
				expect(field.cast('3.14')).to.be.eql(3);
			});
		});

		describe('Positive Integer field', () => {
			let field = new Fields.PositiveInteger();

			it('Validates positive integers (no 0)', () => {
				expect(field.validate(5)).to.be.true;
				expect(field.validate('56')).to.be.true;
				expect(field.validate(-3.14)).to.be.false;
				expect(field.validate('-3.14')).to.be.false;
				expect(field.validate('0')).to.be.false;
				// Special case
				expect(field.validate(0)).to.be.eql('Cannot be zero');
			});

			it('Validates positive integers (0)', () => {
				let field = new Fields.PositiveInteger({ zero: true });
				expect(field.validate(5)).to.be.true;
				expect(field.validate('0')).to.be.false;
			});

			it('Casts integers', () => {
				expect(field.cast(5)).to.be.eql(5);
				expect(field.cast('56')).to.be.eql(56);
				expect(field.cast(3.14)).to.be.eql(3.14);
				expect(field.cast('3.14')).to.be.eql(3.14);
				expect(field.cast(0)).to.be.eql(0);
			});
		});
	});

	describe('Boolean Field', () => {
		let field = new Fields.Boolean();

		it('Validates booleans', () => {
			expect(field.validate(true)).to.be.true;
			expect(field.validate(false)).to.be.true;
			expect(field.validate([])).to.be.false;
			expect(field.validate({})).to.be.false;
			expect(field.validate(5)).to.be.false;
			expect(field.validate('plep')).to.be.false;
		});

		it('Casts to booleans', () => {
			expect(field.cast(5)).to.be.true;
			expect(field.cast({})).to.be.true;
			expect(field.cast('')).to.be.false;
			expect(field.cast(0)).to.be.false;
			expect(field.cast(false)).to.be.false;
			expect(field.cast(true)).to.be.true;
		});
	});

	describe('Object Field', () => {
		let field = new Fields.Object();
		class Test {}
		it('Validates booleans', () => {
			expect(field.validate({})).to.be.true;
			expect(field.validate([])).to.be.true;
			expect(field.validate(new Test())).to.be.true;
			expect(field.validate(new Date())).to.be.true;
			expect(field.validate(5)).to.be.false;
			expect(field.validate('plep')).to.be.false;
			expect(field.validate(2.124)).to.be.false;
			expect(field.validate(Symbol(123))).to.be.false;
		});
	});

	describe('Array field', () => {
		let field = new Fields.Array();
		class OtherField extends Fields.GenericField {
			validate(value) {
				return value % 2 === 0;
			}	
		}

		it('Validates arrays', () => {
			expect(field.validate([])).to.be.true;
			expect(field.validate({})).to.be.false;
			expect(field.validate(new Date())).to.be.false;
			expect(field.validate(5)).to.be.false;
			expect(field.validate('plep')).to.be.false;
			expect(field.validate(2.124)).to.be.false;
			expect(field.validate(Symbol(123))).to.be.false;
		});

		it('Validates empty arrays', () => {
			let field = new Fields.Array({ empty: false });
			expect(field.validate([])).to.be.eql('Array cannot be empty');
			expect(field.validate([5])).to.be.true;
		});

		it('Validates arrays of specific fields', () => {
			let field = new Fields.Array({ of: new OtherField() });
			expect(field.validate([])).to.be.true;
			expect(field.validate([4, 6, 8, 10])).to.be.true;
			expect(() => field.validate([4, 6, 8, 10, 11, 12, 18])).to.throw(Error);
		});
	});

	describe('Foreign Keys', () => {
		fixtures.connect();

		let field = new Fields.ForeignKey({ Model: ModelA });
		it('Validates foreign key models', () => {
			expect(() => field.is_valid(0)).to.throw(Error, 'Value 0 is not an instance of ModelA');
			expect(field.is_valid(new ModelA())).to.be.true;
		});

		it('Validats that name_id exists', () => {
			// Validates that the _id value exists
			expect(field.is_valid(null, 'a', { a_id: 1234 })).to.be.eql(true);
		})

		it('Casts values correctly', () => {
			expect(() => field.cast(5)).to.throw(Error, 'ForeignKey field needs a model');
			expect(field.cast({ plep: 32 })).to.be.an.instanceof(ModelA);
		});
	});
});
