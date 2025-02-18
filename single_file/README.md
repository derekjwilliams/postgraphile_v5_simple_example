# Node Express Server in a Single File

### What This Does

Runs Postgraphile in a node express server.

### Implementation

Uses one Typescript File, `server.ts`

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

Open `server.ts` to see the code. The contents are explained below in [Exploring The Code](#exploring-the-code)

### Well, There Are Two Other Files

There are, of course, other files for configuration: `package.json` and `env.example`.

These do the standard things that you would expect, specify what npm packages to load(with the bare minimum in this example), what settings to use for the database connection string and schema, and specify running the server to run when entering `npm run dev`

Copy `env.example` to `.env` (or `.env.local`) and edit to match your database settings.

## Motivation

Small steps to learn how to use the Postgraphile library and ecosystem.

A production application would not use this as is. A production application would address authentication concerns, have plugins to extend functionality, use production logging, integrate with analytics, etc.

This is in no way intended to show best practices but can be considered a next step after learning [how to run Postgraphile from the command line](https://postgraphile.org/postgraphile/next/usage-cli).

npx pgl@beta -P pgl/amber -e -c postgres://user:pass@localhost:5432/coolness

with your user, pass, and your coolness database ❄️

## Disecting The Code

Here are the contents of `server.ts`

```TypeScript
import express from "express";
import { createServer } from "node:http";
import { postgraphile } from "postgraphile";
import { makePgService } from "postgraphile/adaptors/pg";
import { grafserv } from "postgraphile/grafserv/express/v4";
import { PostGraphileAmberPreset } from "postgraphile/presets/amber";

/** @type {GraphileConfig.Preset} */
import express from 'express'
import { createServer } from 'node:http'
import { postgraphile } from 'postgraphile'
import { makePgService } from 'postgraphile/adaptors/pg'
import { grafserv } from 'postgraphile/grafserv/express/v4'
import { PostGraphileAmberPreset } from 'postgraphile/presets/amber'

/** @type {GraphileConfig.Preset} */
const preset = {
  extends: [PostGraphileAmberPreset],
  pgServices: [
    makePgService({
      connectionString: process.env.DB_CONNECTION,
      schemas: [process.env.DB_SCHEMA],
    }),
  ],
}
;(async () => {
  const app = express()
  const server = createServer(app)
  server.on('error', (e) => {
    console.dir(e)
  })
  const pgl = postgraphile(preset)
  const serv = pgl.createServ(grafserv)
  await serv.addTo(app, server)
  server.listen(5050, () => {
    console.log('Server listening at http://localhost:5050')
  })
})()
```

This can be considered to have three sections at the top level

1. Imports

2. Configuration For Postgraphile

3. The Express Application with Postgraphile Parts

### 1. Imports

```TypeScript
import express from "express";
import { createServer } from "node:http";
```

Imports for express and http server, which are used to create the express application and then listen to the http requests.

```TypeScript
import { postgraphile } from 'postgraphile'
import { makePgService } from 'postgraphile/adaptors/pg'
import { grafserv } from 'postgraphile/grafserv/express/v4'
import { PostGraphileAmberPreset } from 'postgraphile/presets/amber'
```

These are the Postgraphile libraries.

#### `postgraphile`

The core for Postgraphile

#### `makePgService`

Used for configuration

See [Configuration](https://postgraphile.org/postgraphile/next/config) for description of `makePgService`

#### `grafserv`

Server plugin that handles http requests

#### `PostGraphileAmberPreset`

Set of presets that provide a standard set of functionality for Postgraphile

### 2. Configuration For Postgraphile

This is where we set the connection string for the database and set the schema. If the schema is not set then 'public' is used.

```TypeScript
const preset = {
  extends: [PostGraphileAmberPreset],
  pgServices: [
    makePgService({
      connectionString: process.env.DB_CONNECTION,
      schemas: [process.env.DB_SCHEMA],
    }),
  ],
}
```

### 3. The Express Application with Postgraphile Parts

This is where Postgraphile is connected to the express server.

```TypeScript
  const app = express()
  const server = createServer(app)
  server.on('error', (e) => {
    console.dir(e)
  })
  const pgl = postgraphile(preset)
  const serv = pgl.createServ(grafserv)
  await serv.addTo(app, server)
  server.listen(5050, () => {
    console.log('Server listening at http://localhost:5050')
  })
```

Create the express application

```TypeScript
const app = express()
```

Create a node:http server with the express application

```TypeScript
const server = createServer(app)
```

Create a Postgraphile Instance (`pgl`) using the `preset` configuration

```TypeScript
const pgl = postgraphile(preset)
```

Create the GraphQL http server using the Postgraphile instance

```TypeScript
const serv = pgl.createServ(grafserv)
```

Connect the GraphQL http server to the express application and node:http server

```TypeScript
await serv.addTo(app, server)
```

## Diving Deeper Into The Postgraphile Library(For the very curious)

### Presets, like `PostGraphileAmberPreset`

Presets are a collection of plugins, configuration options, and other presets that get merged together recursively to build the users ultimate configuration.

From the [documentation](https://postgraphile.org/postgraphile/next/migrating-from-v4/migrating-custom-plugins/#presets)

The source for PostGraphileAmberPreset is [here](https://github.com/graphile/crystal/blob/36f121e4bab69e6f63351c9b4e51a7a54e225557/postgraphile/postgraphile/src/presets/amber.ts#L59)

See [Library Usage Documentation](https://postgraphile.org/postgraphile/next/usage-library) for more details.

#### `makePgService` Details

See here for more https://postgraphile.org/postgraphile/next/config/#pgservices
