---
id: mongo
title: Mongo
sidebar_label: Mongo
slug: /reference/mongo
---


The `Mongo` class is the main interface from which you connect to a database.
It proxies [`MongoClient`](https://mongodb.github.io/node-mongodb-native/3.6/api/MongoClient.html)
so you should be able to call any methods implemented by it\*.

:::important
\* The `MongoClient` methods are only proxied if a `client` exists inside the `Mongo` instance,
which means `connect()` has been called successfully
:::

## Class Properties

### `client`
The `MongoClient` instance recovered after a successful connection.

### `url`
The `url` used for connecting to a MongoDB instance. Should look something like
```
mongodb://username:password@hostname:port/db?query1=value1&query2=value2
```

Usually your MongoDB provider will let you coupy/paste this string.

### `connection_options`

If an `url` is not provided, you can alternatively provide an object with every "part" of the string,
to be constructed by the class itself:

| Property | Required | Default | Description |
|:--------:|:--------:|:-------:|:-----------:|
| `host` | Yes | No default | The host used to connect. For example `mongodb.mydomain.com` |
| `protocol` | No | `'mongodb'` | The protocol used for the connection. Usually `mongodb` or `mongodb+srv` |
| `username` | No | `''` | The username used for the connection |
| `password` | No | `''` | The password associated with the given username. Used for the connection |
| `port` | No | `27017` | The port used to connect to the database |
| `query` | No | `{}` | An object where every key/value pair will be parsed to create a querystring. Example: `{ key: 'val', key2: 'val2' }`  will be transformed to `key=val&key2=val2`. The `?` will be appended later|
| `database` | No | `null` | The database used in the Mongo instance |

### `options`
Any options to be used in [`MongoClient.connect`](https://mongodb.github.io/node-mongodb-native/3.6/api/MongoClient.html#.connect)

We recommend adding `{ useUnifiedTopology: true }` at the very least if you're able. 

:::info
This library _will not_ add options on it's own. The default is `{}`.
:::

### `database`

The name of the database used in the Mongo instance. Only used to facilitate recovering the DB object later.

## `Mongo#constructor`

#### Signature

`Mongo#constructor(properties={})`

The class constructor takes any params listed above and calls `this.config()`,  setting them for the instance.

:::warning
This module is exported as a singleton. You can have access to the constructor by accessing it from the instance itself, but
you won't usually need it.
```js
const { Mongo } = require('@jsmrcaga/mongo');

class MyOwnMongo extends Mongo.constructor {}
```
:::

## `config`

#### Signature
`Mongo.config({ url, options, connection, database })`

Takes any params listed in the signature and sets them in the instance.

`options` is the list of options that will be passed to [`MongoClient.connect`](https://mongodb.github.io/node-mongodb-native/3.6/api/MongoClient.html#.connect)

`connection` will be mapped to `connection_options`.

```js
const { Mongo } = require('@jsmrcaga/mongo');
Mongo.config({
	url: 'this is my url',
	options: {
		useUnifiedTopology: true
	},
	database: 'my_db'
});
```

## `get_connection_url`

If a `url` property has been defined, it will return that property. No checks are performed on it.

If a `connection_options` object is provided in the instance, it will construct the `url` from it.

```js
const { Mongo } = require('@jsmrcaga/mongo');
Mongo.config({
	url: 'this is my url'
});

let url = Mongo.get_connection_url();
// > url === 'this is my url'
// true
```

## `connect`

#### Signature

`Mongo.connect(options={})`

Calls `this.config()` setting any options provided in the `options` parameter before the connection is attempted.

Attempts a connection to the MongoDB instance and returns a promise

```js
const { Mongo } = require('@jsmrcaga/mongo');

Mongo.connect({
	connection: {
		host: 'localhost',
		username: 'mongo',
		password: 'password'
	},
	database: 'test_db',
	options: {
		useUnifiedTopology: true
	}
}).then(() => {
	console.log('Connected!');
}).catch(e => {
	console.error('Could not connect', e);
});

```

## `disconnect`

Attempts instance disconnection and returns a promise. Under the hood it just calls `MongoClient.close()`.

## `db`

#### Signature

`Mongo.db(name)`

Returns a `Database` instance, which is a proxy for Mongo driver's [`Db`](https://mongodb.github.io/node-mongodb-native/3.6/api/Db.html).

If no name is provided _and_ a `database` property exists in the instance, that property is used instead.

```js
const { Mongo } = require('@jsmrcaga/mongo');

Mongo.connect().then(() => {
	const db = Mongo.db('my_super_db');
});
```
