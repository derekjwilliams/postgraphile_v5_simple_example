// CustomPostgisMutationsPlugin.ts
import type { GraphileConfig } from 'graphile-config'
import { makeExtendSchemaPlugin, gql } from 'graphile-utils'
import { sql, compile } from 'pg-sql2'
import type { PgExecutor } from '@dataplan/pg'
// Import Grafast Step types/functions needed for the PAYLOAD plan
import type { ExecutableStep } from 'grafast'
import { access, __ItemStep } from 'grafast' // Keep __item and access
import { version } from './version.js'

// 1. Define the GraphQL Schema extensions (SDL) - NO CHANGES HERE
const MySchemaExtensionSDL = gql`
  input SimpleWktInput {
    column1: String!
    geolocation: String! # Expecting WKT string here
  }
  input CreateSimpleWithWktInput {
    clientMutationId: String
    simple: SimpleWktInput!
  }
  type CreateSimpleWithWktPayload {
    clientMutationId: String
    simple: Simple
    # query: Query
  }
  extend type Mutation {
    createSimpleWithWkt(
      input: CreateSimpleWithWktInput!
    ): CreateSimpleWithWktPayload
  }
`

// 2. Create the plugin fragment using makeExtendSchemaPlugin
const MySchemaExtensionPlugin = makeExtendSchemaPlugin({
  typeDefs: MySchemaExtensionSDL,
  resolvers: {
    // Resolver for the main mutation - ONLY use async resolve here
    Mutation: {
      // Remove the object structure with extensions.grafast.plan
      // Provide only the async resolve function directly
      createSimpleWithWkt: async (
        _parent: any,
        args: { input: { simple: { column1: string; geolocation: string } } },
        context: any,
        _resolveInfo: any
      ) => {
        console.log(
          '[CustomMutation RESOLVE] Running createSimpleWithWkt resolver.'
        ) // Keep logs if needed
        const executor = context.pgExecutor as PgExecutor | undefined
        if (!executor) {
          console.error(
            'CustomPostgisMutationsPlugin: PgExecutor not found in GraphQL context.'
          )
          throw new Error('Database connection is unavailable for mutation.')
        }
        const { simple: simpleInput } = args.input
        const { column1, geolocation: wktString } = simpleInput

        try {
          const queryFragment = sql`
            INSERT INTO public.simple (column1, geolocation)
            VALUES (${sql.value(column1)}, ST_GeomFromEWKT(${sql.value(
            wktString
          )}))
            RETURNING *;
          `
          const compiledQuery = compile(queryFragment)
          const mutationOptions = {
            text: compiledQuery.text,
            values: compiledQuery.values,
            context: context,
          }
          const result = await executor.executeMutation(mutationOptions)
          const insertedRow = result.rows[0]

          if (!insertedRow) {
            console.error(
              '[CustomMutation RESOLVE] No row returned after insert.'
            )
            throw new Error('Failed to insert row or retrieve returning data.')
          }

          console.log(
            '[CustomMutation RESOLVE] Insert successful, returning raw row data.'
          )
          // Return the raw data needed by the payload resolver/plan
          return {
            insertedSimpleRow: insertedRow,
            clientMutationId: args.input.simple.column1,
          }
        } catch (e) {
          console.error(
            '[CustomMutation RESOLVE ERROR] Error during mutation execution:',
            e
          )
          throw e
        }
      }, // End of createSimpleWithWkt function
    }, // End Mutation resolvers

    // Payload Resolver - KEEP the plan function here
    CreateSimpleWithWktPayload: {
      simple: {
        extensions: {
          grafast: {
            plan($payload: ExecutableStep): ExecutableStep {
              console.log(
                '[CustomMutation PLAN] Planning CreateSimpleWithWktPayload.simple'
              )
              const $insertedRowData = access($payload, ['insertedSimpleRow'])
              // Use __item to wrap the raw data for Grafast
              return new __ItemStep($insertedRowData)
            },
          },
        },
      },
      // query: { ... } // Resolver/plan for query field if needed
    },
    // --- END PAYLOAD RESOLVER ---
  }, // End resolvers object
})

// 3. Define the final plugin
export const CustomPostgisMutationsPlugin: GraphileConfig.Plugin = {
  // name: 'CustomPostgisMutationsPlugin',
  version: version,
  ...MySchemaExtensionPlugin,
}
