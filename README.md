# Mongo as it was meant to be

The idea beahing this package is to leave the developer as much freedom as possible, 
while still providing some utility methods to use in Mongo.

In this package models depend on the DB connection, enabling you to have multiple
connections, and allowing for model handling without being concerned by the DB location.

# Exports

This module exports `Database` and `ModelFactory` properties in an object:
```
module.exports = { Database, ModelFactory };
```

# tl;dr
```js
const { Database, ModelFactory } = require('@jsmrcaga/mongo');

const myDB = new Database('test-db', {
	username: 'test-user',
	password: 'mypassword',
	endpoint: 'localhost',
	port: 46037,
	database: 'test-db'
});


const UserModel = myDB.model('User');

// can also be defined as
// const UserModel = ModelFactory(myDB, 'User');

class User extends UserModel {
	constructor(name, lastname) {
		super();
		this.name = name;
		this.lastname = lastname;
	}
}

const me = new UserModel();
me.name = 'Test';
me.lastname = 'User';
await me.save();

const brother = new User('Brother', 'User');
brother.save();

const Account = myDB.model('Account');

const account = new Account();
account.user = me.id;
await account.save();

let [myAccount] = await me.related(Account);

let annotatedMe = await me.annotate(Account);
assert(annotatedMe.account.id === account.id);

let [myself] = await User.get({id: me.id});
let allOfUs = await User.all();

allOfUs = allOfUs.map(person => {person.age = Math.random() * 100; return person;});

await User.updateMany(allOfUs);

let allOfThem = allOfUs.map(me => reverse(me));
await User.insertMany(allOfThem);

// coming in the next weeks
let [myFacebookAccount] = Account.query('type=facebook (user=54 or name="Test") token_expired=false');
```

# API

## `Database`
The `Database` object represents a Database connection. It will also expose a function to
create models that depend on it.

### `constructor(name, [options])`

### `connected()`

### `model(name, [options])`

### `connect([options])`

### `disconnect()`

### `clear()`


## `ModelFactory(database, model_name, [model_options])`

## `Model`

### `constructor()`

### static `name()`

### static `all()`

### static `get()`

### static `find()`

### static `collection()`

### static `insertMany()`

### static `updateMany()`

### static `query()`

### `related(model, [prop], [myProp])`

### `annotate(OtherModel, [ownProp], [params])`

### `save()`
