---
id: tldr
title: tl;dr
sidebar_label: tl;dr
slug: /tldr
---

## What is @jsmrcaga/mongo

This package is intended to help developers write fast and efficient Mongo queries.

It is loosely inspired by Django's ORM API, and implements utility methods to help with
* Connection
* Models
* Aggregation

## Installation

```sh
npm i @jsmrcaga/mongo
```

## Connection

### Connecting to Mongo

Connections are made by passing a list of options. This library will not add options automatically
and will let you decide what to pass. If you don't pass `useUnifiedTopology` Mongo will probably throw a warning.

```js
const { Mongo } = require('@jsmrcaga/mongo');

Mongo.connect({
	url: 'mongodb://myusername:pswd@my_db_host:27017/my_db',
	database: 'my_db',
	options: {
		useUnifiedTopology: true
	}
}).then(() => {
	console.log('OK!');
}).catch(e => {
	console.error('NOK', e);
});
```

### Using a Database

```js
const { Mongo } = require('@jsmrcaga/mongo');

// If defined in "options" under database
const my_db = Mongo.db();

// For another DB
const my_other_db = Mongo.db('my_other_db');
```

## Models

### Creating a Model
Models can use validation schemas and some other options.

Models create/use collections automatically.Collection names are defined by kebab-casing
the model name.

For example, if you have a model called `MySuperModel`, the corresponding collection would be `my-super-model`.

```js
const { Model } = require('@jsmrcaga/mongo');

class MySpecialModel extends Model {}

MySpecialModel.objects.find().execute().then(docs => {
    // do somehting with my found models
    console.assert(docs.every(doc => doc instanceof MySpecialModel), '🔥');
}).catch(e => {
	console.error('Could not get models from DB', e);
});
```

### Validation & Extra Fields

```js
const { Model, Fields } = require('@jsmrcaga/mongo');

class Cat extends Model {
	meow() {
		console.log('Miaou!');
	}
}

Cat.VALIDATION_SCHEMA = {
	// Forces a name, and must be different from ''
	name: Fields.String({ required: true, blank: false })
};

// Disabling extra fields means that we cannot create Cats
// with anything other than `name`
Cat.ALLOW_EXTRA_FIELDS = false;

// Cat model will use a collection named dogs
Cat.COLLECTION = 'dogs';
````

### Saving and updating models
:::important
By default this library adds three properties to your models:
* `__created`: Stores the millisecond timestamp for the object's creation
* `__updated`: Stores the millisecond timestamp for the object's last update operation
* `__deleted`: Stores the millisecond timestamp for the object's deletion
:::

#### Creating a new model
```js
class User extends Model {}
const user = new User({ username: 'gollom' });
user.save().then(doc => {
	console.log('Saved!');
}).catch(e => console.error(e));
````

#### Updating a model
```js
// Oops, typo in last usrname
user.username = 'gollum';
user.save();
````

You can also update models with more data and wait for success to update it in RAM
```js
user.update({
	name: 'gollum'
}).then(() => {
	console.assert(user.name === 'gollum');
}).catch(e => {
	console.assert(user.name !== 'gollum');
});
````

#### Deleting models
The `delete()` method soft-deletes your object
```js
user.delete();
```

The `hard_delete()` method removes your document from the collection
```js
user.hard_delete();
```

## Queries

Querying the DB becomes really easy with `@jsmrcaga/mongo`.

### Accessing `mongodb` collections

if for any reason you need to access the base collection from `mongodb` driver:

```js
MyModelClass.collection
```

gives you a direct access. Any methods and properties are untouched and can be used directly
from the driver.

```js
MyModelClass.collection.findOne({ _id: 1234 }).then((doc) => {
	console.assert((!doc instanceof MyModelClass));
});

```

### Using the manager

Every model comes with a manager under the static `objects` property. This should be your main interface to call collection methods.

All methods from the manager are passed through a proxy. If they return a `Cursor` they
will be proxied by this library's own `Cursor` class, which enables automatic instanciation.


You can get your results by "`executing`" the cursor, which performs a `toArray()` operation
and special instanciations.


```js
const cursorProxy = MyModelClass.objects.find({ group: 1234 });

cursorProxy.execute().then((docs) => {
	// all docs are instances of MyModelClass
});

```

This also enables you to use all normal cursor methods, like `skip` and `limit`, enabling you
to build generic interfaces (for a REST API for example)


### Getting single objects

The equivalent to `findOne` using the manager is `get`.
```js
MyModelClass.collection.get({ _id: 1234 }).then((doc) => {
	console.assert(doc instanceof MyModelClass);
});

```

Please note that this is a special `Queryset` method and not a `Manager` method, but managers proxy-call Queryset methods.

## Aggregation

Every manager comes with a built-in `Queryset` instance that allows building aggregation pipelines.

Using different methods you can build an aggregation pipeline and run it against your DB. Some methods are pre-writter

### tl;dr

```js
class Role extends Model {}
Role.VALIDATION_SCHEMA = {
	rights: new Fields.Array({
		required: true,
		of: new Fields.String({ blank: false })
	}),

	name: new Fields.String({
		blank: false,
		required: true
	})
};

class User extends Model {}
User.VALIDATION_SCHEMA = {
	role: new Fields.ForeignKey({ Model: Role });
};

// Example user:
// { name: 'user', cats: ['cat1', 'cat2'], role_id: 1234, group: 'a' }

const queryset = User.objects.active().filter({
	group: 'a'
}).select_related('role').annotate({
	cats_count: {
		$sum: '$cats'
	}
});

// Will print all operations to be run
queryset.explain();

// Get normal aggregation cursor. Do this if you don't
// return Model instances.
const aggregation_cursor = queryset.run();

// done() calls a specail Cursor proxy to instanciate objects
queryset.done().then(docs => {
	// Example returned
	/*
	User {
		_id: 987,
		group: 'a',
		name: 'user 1',
		cats: ['cat1', 'cat2', 'cat3'],
		cats_count: 3,
		role_id: 1234,
		role:  Role {
			_id: 1234,
			name: 'Read Feature 1',
			rights: ['fature1-read']
		}
	}
	*/
})
```
