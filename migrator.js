const fs = require('fs-jetpack')
const paramCase = require('param-case')

module.exports = class Migrator {
	constructor({ client, path = './migrations', quiet = false }) {
		this._client = client
		this._path = path
		this._quiet = quiet

		if (quiet) {
			this.error = () => {}
			this.log = () => {}
		} else {
			this.log = console.log.bind(console)
			this.error = console.error.bind(console)
		}
	}

	async migrate(path = this._path) {
		const migrationDir = fs.dir(path)
		await this._client.query('CREATE TABLE IF NOT EXISTS _hnt_mgr ( "name" TEXT PRIMARY KEY UNIQUE, "at" timestamptz NOT NULL default now() )')
		const { rows } = await this._client.query('select "name" from _hnt_mgr')
		const migrations = await migrationDir.listAsync()
		let hasExecuted = false
	
		for (const migrationName of migrations) {
			const missing = !rows.find(row => row.name === migrationName)
			if (missing) {
				const content = await fs.readAsync(migrationDir.path(migrationName, 'up.sql'))
				await this._client.query('BEGIN')
				this.log("---")
				this.log(`Migrating ${ migrationName }`)
				try {
					await this._client.query(content)
					await this._client.query('INSERT INTO _hnt_mgr("name") VALUES ($1)', [migrationName])
					await this._client.query('COMMIT')
					hasExecuted = true
					this.log(`Successfully migrated ${ migrationName }`)
				} catch(e) {
					await this._client.query('ROLLBACK')
					this.error('Failed to migrate %s', migrationName)
					throw e
				}
				this.log("---")
			}
		}
	
		if (!hasExecuted) {
			this.log("No migrations to run")
		}
	}
	
	async rollback(path = this._path) {
		const migrationDir = fs.dir(path)
		await this._client.query('CREATE TABLE IF NOT EXISTS _hnt_mgr ( "name" TEXT PRIMARY KEY UNIQUE, "at" timestamptz NOT NULL default now() )')
		const { rows } = await this._client.query('select "name" from _hnt_mgr ORDER BY "at" DESC')
		const migrations = await migrationDir.listAsync()
		let hasExecuted = false
	
		for (const row of rows) {
			const migrationName = migrations.find(migrationName => row.name === migrationName)
			if (migrationName != null) {
				const content = await fs.readAsync(migrationDir.path(migrationName, 'down.sql'))
				await this._client.query('BEGIN')
				this.log("---")
				this.log(`Rolling back ${ migrationName }`)
				try {
					await this._client.query(content)
					await this._client.query('DELETE FROM _hnt_mgr WHERE "name"=$1', [migrationName])
					await this._client.query('COMMIT')
					hasExecuted = true
					this.log(`Successfully rolled back ${ migrationName }`)
				} catch(e) {
					await this._client.query('ROLLBACK')
					this.error('Failed to roll back %s', migrationName)
					throw e
				}
				this.log("---")
			}
		}
	
		if (!hasExecuted) {
			this.log("No migrations to roll back")
		}
	}

	async generate(name, path = this._path) {
		const now = Date.now()
		const outname = `${ now }-${ paramCase(name) }`

		const outdir = fs.dir(path).dir(name)

		const up = '-- Code to execute when migrating the schema'
		const down = '-- Code to execute when rolling back the schema'

		await outdir.fileAsync('up.sql', { content: up })
		await outdir.fileAsync('down.sql', { content: down })
	}
}