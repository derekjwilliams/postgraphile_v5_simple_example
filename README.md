# postgraphile_v5_simple_example

Simple Examples of using Postgraphile in a node express server

## Aknowledgements

Benjie and the contributors at [Graphile/Crystal](https://github.com/graphile/crystal) have created Postgraphile, many thanks to them.

## Two Examples

See the README.md files in the `single_file` and `simple_node_project` directories for instructions on running these.

### Simple, Single File Node Express Server

Most basic example is in `single_file` directory. The entire server is contained in one file, server.ts.

### Simple, But With Separation of Concerns Node Express Server

The `simple_node_project` directory contains a project with three files, to separate the configution, postgrahile, and express server concerns.

### Future Work

Goal is to add examples that include:

- Typesafe environment variables

- pino logging

- Authentication

- jwt handling

- Row leven security

- Plugins

  I would also like to get some of the existing plugins working, I am most interested in the [graphile/postgis](https://github.com/graphile/postgis) plugin, the [connection filter](https://github.com/graphile-contrib/postgraphile-plugin-connection-filter) plugin would also be nice to have.
