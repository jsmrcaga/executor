---
id: transaction
title: Transaction
sidebar_label: Transaction
slug: /reference/transaction
---

`Transaction` is a special class that allows you to add queries and commit them
in one single batch, rolling back if any error occurs (on the DB or in your code inside the `Transaction`).

For more info please refer to [The MongoDB manual](https://docs.mongodb.com/manual/core/transactions/)

## tl;dr - Usage
This is an example of using a transaction from Executor.

```js
const { Mongo } = require('@jsmrcaga/executor');

// Get default DB
const db = Mongo.db();

// Create transaction
let transaction = db.transaction()

// Sadly binding is necessary, since the `this` arg will need
// to be reused inside
transaction.add(my_user.save.bind(my_user));
transaction.add(my_user_role.save.bind(my_user_role));

// We can also pass as many args aas we would normally pass to query
transaction.add(other_thing.update.bind(other_thing), {
	name: 'New name!'
});

// And even options. But please read below to make sure everything works as
// expected
transaction.add(other_thing.update.bind(other_thing), {
	name: 'New name!'
}, {
	upsert: true
});


// Finally, we can commit the transaction
transaction.commit().then(() => 'yay!').catch(e => console.error(e));
```

## Class Properties

### `db`
A [`Database`](db) instance.


## `Transaction#constructor`

#### Signature
```js
new Transaction(db);
```

:::warning
You won't usually need to instanciate the Transaction object yourself. This is done for you using the 
[`db.transaction()`](db#transaction) method:
:::
```js
const { Mongo } = require('@jsmrcaga/executor');

const db = Mongo.db();

const newTransaction = db.transaction()
```

## `add`

#### Signature
```js
transaction.add(query, ...args)
````

This function takes two arguments. The first one is the query function you would like to run.

:::important
`query` MUST be a _bound callable_ function. Look at the example below.
Usually you will need to bind your function to keep `this` intact.
:::

The rest (`args`) are all the arguments you would like to pass to your query function when running it.

:::warning
When running a transaction, the transaction method will run query by query, checking the [`length`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/length) of each
query (meaning the number of arguments it can take).

For `Transaction` the _LAST_ argument is _ALWAYS_ the `options` passed to the driver. Which means that if the last argument is provided, `Transaction` will try to merge it and add its `session`.

If there are any missing arugments between the provided list and the last one, `Transaction` will fill them with `undefined`.
:::

Example
```js
// Function with no extra arguments
transaction.add(my_user.save.bind(my_user));

// Function with all its arguments
transaction.add(other_thing.update.bind(other_thing), {
	name: 'New name!'
}, {
	upsert: true
});
````

## `commit`

#### Signature
```js
transaction.commit()
````

Commits the transaction using [`db.atomic()`](db#atomic).

This method will run every query function passed to it, and return a `Promise.all` of the lot.
