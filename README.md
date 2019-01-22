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

// CONNECTION
myDB.connect({
	protocol, 
	endpoint, 
	username, 
	password,
	port, 
	database,
	timeout, 
	...mongoUsualConnectionOptions
});
```

# API

## `Database`
The `Database` object represents a Database connection. It will also expose a function to
create models that depend on it.

### `constructor(name, [options])`
> Creates a new Database object. You should give it a name.

`options` is an `Object` containing connection options that will be passed to Mongo Driver: 

```js
 options = {
 	protocol,
 	endpoint,
 	username,
 	password,
 	port,
 	database,timeout
}
```

### `connected()`
> `true` if the database is connected to a Mongod instance, `false` otherwise

### `model(name, [options])`
> Creates a new model on this Database instance

`name` is a `string` giving the name of the object. 

```js
let UserModel = database.Model('User');
```

This will create a collection on the database with the model's name lowercased. If you would like
the collection to be plural, set the model name to plural.

> **Returns `Class`**

### `connect([options])`
> Connects to mongod instance

`options` is a connection options `Object` that will be passed to Mongo Driver. It is not needed
if the database object was instanciated with them. Otherwise it will override them.

### `disconnect()`
> Disconnects from database

> **Returns `Promise`**

### `clear()`
> Clears the database (deletes all collections)
> **Returns `Promise`**

## `ModelFactory(database, model_name, [model_options])`
> Creates a model for the given database instance and for given name.

`model_options` is an object. Unused for now.

## `Model`
Represents a model on the database. When retrieving objects they will be instanciated to this class.

### `constructor()`
By default the constructor for a created model has a length of 0 (ie: it has no parameters);
If you add parameters this driver will pass the received object from database as 1st parameter 
to the constructor.

The only property set by this constructor is `.id`. If you override it, please do it carefully.

If you would like to override this behaviour please refer to `static fromJSON(obejcts)`;

### static `name()`
> Returns the name of the current object (in LowerCase);

> **Returns `string`**

### static `all()`
> Gets all objects from this model (ie: collection) from the database
> **Returns `Promise`**

### static `get(selector = {})`
> Gets objects related to the given selector ([Mongo selector](https://docs.mongodb.com/manual/tutorial/query-documents/)).
If no selector is passed, defaults to `.all()`.

> **Returns `Promise`**

### static `find()`
Alias for `get()`

### static `collection()`
> Returns current [Collection](http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html) object related to the model. 

> ***Throws*** if database is disconnected.

> **Returns `Collection`**


### static `insertMany(instances)`
> Inserts many objects to the collection. `instances` is an array of instances of this object, 
> or object literals containing an `id` property.

> **Returns `Promise`**

### static `updateMany(instances)`
> Updates many objects (one by one) on the collection. `instances` is an array of instances of this object, 
> or object literals containing an `id` property.

> **Returns `Promise`**

### static `deleteMany(instances)`
> Deletes many objects to the collection. `instances` is an array of instances of this object, 
> or object literals containing an `id` property.

> **Returns `Promise`**

### static `query(querystring)`
> ⚠️ Not supported yet

### `related(OtherModel, [prop], [myProp])`
> Fetches related models from another collection.

This method allows you to fetch related objects to the current instance from different collections.

```js
await myUser.related(Car); // --> returns all Car objects related to this user
```

By default it looks up the current model name as a property on the other collection (ie: `car.user`),
and tries to match it with the current model id: `car.user === this.id`;

`prop` overrides the property to look up for in the related model (ex: `car.user_id` would be `myUser.related(Car, 'user_id'))`).

`myProp` overrides the property to check against on the current model (ex: `car.user_id === this.car_id`, would be 
`myUser.related(Car, 'user_id', 'car_id')`)

> **Returns `Promise(objects)`**

### `annotate(OtherModel, [ownProp], [params])`
> Annotates the current model with related objects

This method fetches related objects and annotates current instance with them on `ownProp`.
By default `ownProp` will be `OtherModel.name()`:

```js
await myUser.annotate(Car) // ==> { id: 'user id', 'car': [<list of related cars>] }
```

`params` is an object containing `{prop, myProp}` that will be passed to `Model.related` to fetch related `OtherModel`s.

Note that the result is a copy of the current object with the annotated values. If you save it it will override the current
model and add the annotated values.


> **Returns `Promise(annotated instance)`**

### `save()`
> Saves the current object to database.

> **Returns `Promise`**

### `delete()`
> Deletes the current object from database

> **Returns `Promise`**
