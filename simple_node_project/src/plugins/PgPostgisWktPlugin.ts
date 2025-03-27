import type { PgCodec } from '@dataplan/pg'
import { gatherConfig } from 'graphile-build'
import { EXPORTABLE } from 'graphile-build'
import { version } from './version.js'
import { SQL } from 'postgraphile/pg-sql2'

// Define state to hold our geometry and geography codecs during the gather phase
interface State {
  geometryCodec: PgCodec<
    'geometry',
    undefined,
    string,
    string,
    undefined,
    undefined,
    undefined
  >
  geometryArrayCodec: PgCodec

  geographyCodec: PgCodec<
    'geography',
    undefined,
    string,
    string,
    undefined,
    undefined,
    undefined
  >
  geographyArrayCodec: PgCodec
}

// Cache isn't strictly needed for this simple case yet

// Allow enabling the plugin via preset config
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace GraphileConfig {
    interface Plugins {
      PgPostgisWktPlugin: true
    }
  }
}

export const PgPostgisWktPlugin: GraphileConfig.Plugin = {
  name: 'PgPostgisWktPlugin',
  version,

  gather: gatherConfig({
    initialState(cache: Cache, { lib }): State {
      const {
        dataplanPg: { listOfCodec },
        sql,
      } = lib

      // --- Geometry  Codecs ---
      // Codec for scalar 'geometry' type
      const geometryCodec: State['geometryCodec'] = EXPORTABLE(
        (sql) => ({
          name: 'geometry',
          sqlType: sql`pg_catalog.text`, // Since ST_AsText returns text

          castFromPg: (fragment) => sql`ST_AsText(${fragment})`,
          fromPg: (value: unknown): string => {
            if (typeof value !== 'string') {
              throw new Error(
                `Expected string from ST_AsText, received ${typeof value} (value: ${String(
                  value
                ).slice(0, 50)})`
              )
            }
            return value
          },

          toPg: (value: string): string => {
            // Return the raw WKT string. This becomes the parameter value.
            return value
          },

          // Input Parameter -> PG Type Conversion, this was to avoid a "String is not SQL error"
          castToPg: (fragment: SQL): SQL => {
            // 'fragment' represents the parameterized WKT string
            // Wrap it with ST_GeomFromEWKT to convert it to geometry in SQL.
            // fragment is the incoming WKT/EWKT string from GraphQL input
            // The sql tag automatically handles parameterization ($1, $2, etc.)
            // to prevent SQL injection.
            return sql`ST_GeomFromEWKT(${fragment})`
          },

          isBinary: false,
          attributes: undefined,
          extensions: undefined,
          domainItemCodec: undefined,
          rangeItemCodec: undefined,
          executor: null, // Required property
        }),
        [sql] // Dependencies for EXPORTABLE
      )

      // Codec for array '_geometry' type
      const geometryArrayCodec = EXPORTABLE(
        (listOfCodec, geometryCodec) => listOfCodec(geometryCodec),
        [listOfCodec, geometryCodec] // Dependencies for EXPORTABLE
      )
      // --- End Geometry Codecs ---

      // --- Geography Codecs -------------

      // Codec for scalar 'geography' type
      const geographyCodec: State['geographyCodec'] = EXPORTABLE(
        (sql) => ({
          name: 'geography',
          sqlType: sql`pg_catalog.text`,

          castFromPg: (fragment) => sql`ST_AsText(${fragment})`,
          fromPg: (value: unknown): string => {
            if (typeof value !== 'string') {
              throw new Error(
                `Expected string from ST_AsText(geography), received ${typeof value} (value: ${String(
                  value
                ).slice(0, 50)})`
              )
            }
            return value
          },
          // Input (JS -> PG Parameter Value) this is to handle the fact that we need to use SQL type and not string
          toPg: (value: string): string => {
            // Return the raw WKT string. This becomes the parameter value for the query.
            return value
          },

          castToPg: (fragment: SQL): SQL => {
            // 'fragment' represents the parameterized WKT string
            // Wrap it with ST_GeogFromText to convert it to geograpy in SQL.
            // Value is the incoming WKT/EWKT string from GraphQL input
            // The sql tag automatically handles parameterization ($1, $2, etc.)
            // to prevent SQL injection.
            return sql`ST_GeogFromText(${fragment})`
          },

          isBinary: false,
          attributes: undefined,
          extensions: undefined,
          domainItemCodec: undefined,
          rangeItemCodec: undefined,
          executor: null, // temporarily null, get's assigned in the hook below, e.g. info.helpers.pgIntrospection.getExecutorForService(serviceName)
        }),
        [sql] // Dependencies for EXPORTABLE
      )

      // Codec for the Array '_geography' type
      const geographyArrayCodec = EXPORTABLE(
        (listOfCodec, geographyCodec) => listOfCodec(geographyCodec),
        [listOfCodec, geographyCodec] // Dependencies for EXPORTABLE
      )

      // Return all the things (codecs)
      return {
        geometryCodec,
        geometryArrayCodec,
        geographyCodec,
        geographyArrayCodec,
      }
    },

    hooks: {
      async pgCodecs_findPgCodec(info, event) {
        if (event.pgCodec) {
          return
        }
        const { serviceName, pgType } = event

        const postgisExt =
          await info.helpers.pgIntrospection.getExtensionByName(
            serviceName,
            'postgis'
          )

        if (!postgisExt || pgType.typnamespace !== postgisExt.extnamespace) {
          return
        }

        const geometryCodecName = info.state.geometryCodec.name
        const geometryArrayTypeName = `_${geometryCodecName}`
        const geographyCodecName = info.state.geographyCodec.name
        const geographyArrayTypeName = `_${geographyCodecName}`

        // Simple map to from codec name to codec
        const typeNameToBaseCodecMap: { [key: string]: PgCodec } = {
          [geometryCodecName]: info.state.geometryCodec,
          [geometryArrayTypeName]: info.state.geometryArrayCodec,
          [geographyCodecName]: info.state.geographyCodec,
          [geographyArrayTypeName]: info.state.geographyArrayCodec,
        }

        const codec = typeNameToBaseCodecMap[pgType.typname]

        // If we found codec name in our map then use the codec found
        if (codec) {
          // get the executor from introspection, e.g. oid may be different in different databases (Thanks Benjie!)
          const executor =
            info.helpers.pgIntrospection.getExecutorForService(serviceName)
          if (!executor) {
            console.warn(
              `PgPostgisWktPlugin: Could not find executor for service '${serviceName}'.`
            )
            return
          }

          // Create the new codec object using the template and the correct executor
          event.pgCodec = {
            ...codec, // spread from the "template"
            executor: executor, // and override the executor
          }

          const oid =
            'oid' in pgType
              ? String((pgType as { oid: unknown }).oid)
              : '[--unknown OID--]'
          console.log(
            `PgPostgisWktPlugin: Found '${pgType.typname}' type (OID ${oid}) in service '${serviceName}', assigning codec '${codec.name}' executor.`
          )
        }
      },
    },
  }),

  schema: {
    hooks: {
      init(_, build) {
        const {
          setGraphQLTypeForPgCodec,
          graphql: { GraphQLString },
          input: { pgRegistry },
        } = build

        // --- Handle Geometry Scalar type ---
        const geometryCodec = pgRegistry.pgCodecs.geometry
        if (geometryCodec) {
          const geometryScalarTypeName = GraphQLString.name
          setGraphQLTypeForPgCodec(
            geometryCodec,
            'output',
            geometryScalarTypeName
          )
          setGraphQLTypeForPgCodec(
            geometryCodec,
            'input',
            geometryScalarTypeName
          )
          console.log(
            `PgPostgisWktPlugin: Mapped SCALAR geometry codec to GraphQL '${geometryScalarTypeName}' type (representing WKT)`
          )
        } else {
          console.warn(
            'PgPostgisWktPlugin: SCALAR geometry codec not found in registry during schema init.'
          )
        }

        // --- Handle Geography Scalar type ---
        const geographyCodec = pgRegistry.pgCodecs.geography
        if (geographyCodec) {
          const geographyScalarTypeName = GraphQLString.name
          setGraphQLTypeForPgCodec(
            geographyCodec,
            'output',
            geographyScalarTypeName
          )
          setGraphQLTypeForPgCodec(
            geographyCodec,
            'input',
            geographyScalarTypeName
          )
          console.log(
            `PgPostgisWktPlugin: Mapped SCALAR geography codec to GraphQL '${geographyScalarTypeName}' type (representing WKT).`
          )
        } else {
          console.warn(
            'PgPostgisWktPlugin: SCALAR geography codec not found in registry during schema init.'
          )
        }
        return _
      },
    },
  },
}
