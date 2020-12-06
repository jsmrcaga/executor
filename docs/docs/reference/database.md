---
id: database
title: Database
sidebar_label: Database
slug: /reference/db
---

`Database` is a class that proxies the [`Db`](https://mongodb.github.io/node-mongodb-native/3.6/api/Db.html) model from MongoDB's Node driver.

It has some utility methods discussed below, but you should be able to call any driver methods directly.

## Class Properties

### `db`
The `MongoClient` db instance recovered after a successful connection and calling `MongoClient.db()`.

### `mongo`
An instance of [`Mongo`](mongo).

## `Database#constructor`

#### Signature
```js
new Database({ db, mongo });
```

:::warning
You won't usually need to instanciate the DB object yourself. This is done for you using the 
[`Mongo.db()`](mongo#db) method:
:::
```js
const { Mongo } = require('@jsmrcaga/executor');

const db = Mongo.db();
```

## `clear`

#### Signature
```js
db.clear(options={})
```
Clears the database by using the [`dropDatabase`](https://mongodb.github.io/node-mongodb-native/3.6/api/Db.html#dropDatabase) method.

You can pass any options to be passed to that method.

## `atomic`
#### Signature
```js
db.atomic(fn, options);
````

This method instanciates a driver's `Session` and proxies [`Session.withTransaction`](https://mongodb.github.io/node-mongodb-native/3.6/api/ClientSession.html#withTransaction).

The first argument `fn` is a function containing every query you want to perform in the transaction. It's only argument is `session`, to be used in the queries options.
:::note
Your function _must_ return a promise. You can use `async` / `await` if you prefer and understand that they only wrap promises. This documentation will only use direct promises.
:::

`options` is an object passed to [`Session.withTransaction`](https://mongodb.github.io/node-mongodb-native/3.6/api/ClientSession.html#withTransaction).

```js
const db = Mongo.db();

db.atomic(session => {
	return my_model.save({ session }).then(() => {
		return model_2.save({ session });
	}).then(() => {
		return model3.update({
			name: 'new name'
		}, { session });
	});
});
```

## `transaction`

#### Signature
```js
db.transaction();
````

This method returns a new [`Transaction`](transaction) instance. Please refer to [its documentation](transaction).
