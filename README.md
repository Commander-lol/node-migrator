# migrator

`migrator` is a framework agnostic tool for running migrations against Postgresql databases.
`migrator` does not provide a built in command line tool by itself, but is instead a programmatic API for creating your own interface.

## Installation

`npm i @commander-lol/migrator`

## Usage

```js
const Migrator = require('@commander-lol/migrator')
const migrator = new Migrator({
    client: getClient(),
    path: 'path/to/migrations',
})

// ...

await migrator.migrate()
```

## API

### Class: Migrator

#### static Migrator#constructor(opts: MigratorOptions) -> Migrator

Creates a new migrator with the given options. See `MigratorOptions` for details

#### Migrator#migrate([path: String]) -> Promise\<undefined>

Runs any migrations in the folder targeted by `path` that do not exist in the database's
`_hnt_mgr` table. If that table does not exist, it will be created.

A migration is run by executing the `up.sql` file contained within a folder that defines the 
migration's name. For example, a folder called `000-create-extensions` should contain an 
`up.sql` file, and will create an entry in the `_hnt_mgr` table for `000-create-extensions`.

`path` defaults to the value provided to the constructor, which itself defaults to the 
directory from which the application was executed (`pwd` in the shell)

#### Migrator#rollback([path: String]) -> Promise\<undefined>

Rolls back any migrations in the folder targeted by `path` that do not exist in the 
database's `_hnt_mgr` table. If that table does not exist, it will be created.

A migration is rolled back by executing the `down.sql` file contained within a folder that 
defines the migration's name. For example, a folder called `000-create-extensions` should 
contain an `down.sql` file, and will create an entry in the `_hnt_mgr` table for 
`000-create-extensions`.

`path` defaults to the value provided to the constructor, which itself defaults to the 
directory from which the application was executed (`pwd` in the shell)

#### Migrator#generate(name: String[, path: String]) -> Promise\<undefined>

Creates a named migration in the folder targetted by `path`. The name of the migration will
be the dash-cased version of `name`, appended to the current timestamp. For example, calling 
`migrator.generate('create user table')` would create a folder in `path` called 
`123456000-create-user-table`, which itself contains `up.sql` and `down.sql` files.

`path` defaults to the value provided to the constructor, which itself defaults to the 
directory from which the application was executed (`pwd` in the shell)

### Interface: ClientInterface

#### ClientInterface#query(query: String) -> Promise\<QueryResult\<T>>

An asynchronous function that will execute an SQL query against the database. `T` should be an object type in the shape of the properties selected by a query. When a query does not expect data to be returned (e.g. `DELETE FROM`) then `T` may be any falsy value.

### Struct: MigratorOptions

#### MigratorOptions#client: ClientInterface

An object that implements the `ClientInterface`. Will be used to run queries against
the database.

#### MigratorOptions#path: [String]

Defines the directory that contains migrations. Defaults to `./migrations`.

#### MigratorOptions#quiet: [Boolean]

Suppress console messages when `true`. Defaults to `false`.

### Struct: QueryResult\<T>

#### QueryResult~T

An object type that should match the shape defined by the database query that produced the `QueryResult`. For example, `SELECT name, email FROM users` should produce a `T` that has the `name` and `email` properties, that are themselves a type that provides as accurate a mapping as possible from the database type to the Javascript type.

Alternatively, a query that is not expected to return anything may defined `T` as a falsy type such as `null` or `undefined`.

#### QueryResult#rows: Array\<T>

An array of `T` values. When `T` is defined as some falsy value for a query that does not return anything, `rows` should still be present. In this scenario, it should simply be an empty array.
