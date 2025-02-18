# Simple Node Express Server in a Three Files

### What This Does

Runs Postgraphile in a node express server.

### Implementation

Uses three files to separate the concerns of the express application:

1. Node Express Server

2. Postgraphile configuration

3. Postgraphile instance

These files are `server.ts`, `graphile.config.ts`, and `pgl.ts` respectively.

## Just Show Me How to Run It Quickly

1. Copy file `env.example` to `.env`

```bash
  cp env.example .env
```

2. Change the DB_CONNECTION value in the `.env` file to match yours:

```
DB_CONNECTION=postgres://your_username:your_password@localhost:5432/your_database
```

3. Install the npm modules and run:

```bash
npm install
npm run dev
```

4. Navigate to http://localhost:5050 in a browser and enter your graphQL query.

Here is a very simple query that will show your database columns and functions. Paste this into the query window in a browser.

```gql
query {
  __schema {
    queryType {
      name
      fields {
        name
        description
      }
    }
  }
}
```

### Show Me The Code

Open `server.ts`, `graphile.config.ts`, and `pgl.ts` to see the code. The contents are explained below in [Exploring The Code](#exploring-the-code)

### package.json and env.example

There are, of course, other files for configuration: `package.json` and `env.example`.

These do the standard things that you would expect, specify what npm packages to load(with the bare minimum in this example), what settings to use for the database connection string and schema, and specify running the server to run when entering `npm run dev`

Copy `env.example` to `.env` (or `.env.local`) and edit to match your database settings.

## Motivation

Small steps to learn how to use the Postgraphile library and ecosystem.

A production application would not use this as is. A production application would address authentication concerns, have plugins to extend functionality, use production logging, integrate with analytics, etc.

This is in no way intended to show best practices but can be considered a next step after learning [how to run Postgraphile from the command line](https://postgraphile.org/postgraphile/next/usage-cli).

npx pgl@beta -P pgl/amber -e -c postgres://user:pass@localhost:5432/coolness

with your user, pass, and your coolness database ❄️

# Disecting The Code

## `server.ts`

```TypeScript
import { createServer } from 'node:http'
import express from 'express'
import { grafserv } from 'postgraphile/grafserv/express/v4'
import { pgl } from './pgl'

const app = express()
const server = createServer(app)
server.on('error', () => {})
const serv = pgl.createServ(grafserv)
serv.addTo(app, server).catch((e) => {
  console.error(e)
  process.exit(1)
})
server.listen(5050)

console.log('Server listening at http://localhost:5050')
```

### Imports

```TypeScript
import express from "express";
import { createServer } from "node:http";
```

Imports for express and http server, which are used to create the express application and then listen to the http requests.

```TypeScript
import { grafserv } from 'postgraphile/grafserv/express/v4'
import { pgl } from './pgl'
```

#### `grafserv`

Server plugin that handles http requests

#### `pgl`

The Postgraphile Instance, created in pgl.ts

### Server Code

Create the express application

```TypeScript
const app = express()
```

Create a node:http server with the express application

```TypeScript
const server = createServer(app)
```

Create the GraphQL http server using the Postgraphile instance (`pgl`)

```TypeScript
const serv = pgl.createServ(grafserv)
```

Connect the GraphQL http server to the express application and node:http server

```TypeScript
await serv.addTo(app, server)
```

### `pgl.ts`

Create a Postgraphile Instance (`pgl`) using the `preset` configuration and export the instance.

```TypeScript
export const pgl = postgraphile(preset)
```

### `pgl.ts`

Create a Postgraphile Instance (`pgl`) using the `preset` configuration and export the instance.

```TypeScript
export const pgl = postgraphile(preset)
```

### `graphile.config.ts`

Configuration of the service

```TypeScript
import { PostGraphileAmberPreset } from 'postgraphile/presets/amber'
import { PgSimplifyInflectionPreset } from '@graphile/simplify-inflection'
import { makePgService } from 'postgraphile/adaptors/pg'
import { PgManyToManyPreset } from '@graphile-contrib/pg-many-to-many'

/** @type {GraphileConfig.Preset} */
const preset: GraphileConfig.Preset = {
  extends: [PostGraphileAmberPreset, PgSimplifyInflectionPreset, PgManyToManyPreset],
  pgServices: [
    makePgService({
      connectionString: 'postgres://postgres:postgres@localhost:5432/events',
      schemas: ['public'],
    }),
  ],
  grafast: {
    explain: true,
  },
}

export default preset
```

#### `makePgService`

Used for configuration.

See [Configuration](https://postgraphile.org/postgraphile/next/config) for description of `makePgService`

#### `PostGraphileAmberPreset`

Set of presets that provide a standard set of functionality for Postgraphile

#### `PgSimplifyInflectionPreset`

Preset that simplifies naming in the queries, see https://github.com/graphile/crystal/tree/main/graphile-build/graphile-simplify-inflection

#### `PgManyToManyPreset`

Preset that exposes relationships between fields, see https://github.com/graphile-contrib/pg-many-to-many

## Diving Deeper Into The Postgraphile Library(For the very curious)

### Presets, like `PostGraphileAmberPreset`

Presets are a collection of plugins, configuration options, and other presets that get merged together recursively to build the users ultimate configuration.

From the [documentation](https://postgraphile.org/postgraphile/next/migrating-from-v4/migrating-custom-plugins/#presets)

The source for PostGraphileAmberPreset is [here](https://github.com/graphile/crystal/blob/36f121e4bab69e6f63351c9b4e51a7a54e225557/postgraphile/postgraphile/src/presets/amber.ts#L59)

See [Library Usage Documentation](https://postgraphile.org/postgraphile/next/usage-library) for more details.

#### `makePgService` Details

See here for more https://postgraphile.org/postgraphile/next/config/#pgservices
