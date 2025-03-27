import type { PgCodec } from '@dataplan/pg'
import { gatherConfig } from 'graphile-build'
import { EXPORTABLE } from 'graphile-build'
import { version } from './version.js'
import { SQL } from 'postgraphile/pg-sql2'
import { GraphQLJSON } from 'graphql-type-json'

// Define state to hold our geometry and geography codecs during the gather phase
interface State {
  geometryCodec: PgCodec<
    'geometry',
    undefined,
    string,
    object,
    undefined,
    undefined,
    undefined
  >
  geometryArrayCodec: PgCodec

  geographyCodec: PgCodec<
    'geography',
    undefined,
    string,
    object,
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
      PgPostgisPlugin: true
    }
  }
}

export const PgPostgisPlugin: GraphileConfig.Plugin = {
  name: 'PgPostgisPlugin',
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
          sqlType: sql`geometry.text`, // Since ST_AsText returns text

          castFromPg: (fragment) => sql`ST_AsGeoJSON(${fragment})`,
          fromPg: (value: unknown): object => {
            if (typeof value !== 'string') {
              throw new Error(
                `Expected string from ST_AsGeoJSON, received ${typeof value} (value: ${String(
                  value
                ).slice(0, 50)})`
              )
            }
            try {
              return JSON.parse(value)
            } catch (e) {
              console.error('Failed to parse GeoJSON string:', value)
              if (e instanceof Error) {
                throw new Error(
                  `Invalid GeoJSON received from database: ${e.message}`
                )
              } else {
                throw e
              }
            }
          },

          toPg: (value: object): string => {
            // Accepts object, returns JSON string
            try {
              // Convert the GeoJSON JS object back into a string for the DB function
              return JSON.stringify(value)
            } catch (e: any) {
              console.error(
                'Failed to stringify GeoJSON object for input:',
                value
              )
              throw new Error(
                `Invalid GeoJSON object provided for input: ${e.message}`
              )
            }
          },

          // Input Parameter -> PG Type Conversion, this was to avoid a "String is not SQL error"
          castToPg: (fragment: SQL): SQL => {
            return sql`ST_GeomFromGeoJSON(${fragment})`
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
          sqlType: sql`geography`,

          castFromPg: (fragment) => sql`ST_AsGeoJSON(${fragment})`,
          fromPg: (value: unknown): object => {
            if (typeof value !== 'string') {
              throw new Error(
                `Expected JSON string from ST_AsGeoJSON, received ${typeof value}`
              )
            }
            try {
              return JSON.parse(value)
            } catch (e) {
              console.error('Failed to parse GeoJSON string:', value)
              if (e instanceof Error) {
                throw new Error(
                  `Invalid GeoJSON received from database: ${e.message}`
                )
              } else {
                throw e
              }
            }
          },
          // Input (JS -> PG Parameter Value) this is to handle the fact that we need to use SQL type and not string
          toPg: (value: object): string => {
            // Accepts object, returns JSON string
            try {
              // Convert the GeoJSON JS object back into a string for the DB function
              return JSON.stringify(value)
            } catch (e: any) {
              console.error(
                'Failed to stringify GeoJSON object for input:',
                value
              )
              throw new Error(
                `Invalid GeoJSON object provided for input: ${e.message}`
              )
            }
          },

          castToPg: (fragment: SQL): SQL => {
            return sql`ST_GeomFromGeoJSON(${fragment})`
          },

          isBinary: false,
          attributes: undefined,
          extensions: undefined,
          domainItemCodec: undefined,
          rangeItemCodec: undefined,
          executor: null, // temporarily null, get's assigned in the hook below, e.g. info.helpers.pgIntrospection.getExecutorForService(serviceName)
        }),
        [sql]
      )

      // Codec for the Array '_geography' type
      const geographyArrayCodec = EXPORTABLE(
        (listOfCodec, geographyCodec) => listOfCodec(geographyCodec),
        [listOfCodec, geographyCodec]
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
              `PgPostgisPlugin: Could not find executor for service '${serviceName}'.`
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
            `PgPostgisPlugin: Found '${pgType.typname}' type (OID ${oid}) in service '${serviceName}', assigning codec '${codec.name}' executor.`
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
          graphql: { GraphQLString, GraphQLInputObjectType, GraphQLNonNull },
          input: { pgRegistry },
          graphql: {},
        } = build

        const CRSInput = new GraphQLInputObjectType({
          name: 'CRSInput',
          description: 'Coordinate Reference System metadata',
          fields: () => ({
            type: {
              type: GraphQLString,
              description: 'CRS type identifier',
            },
            properties: {
              type: GraphQLJSON,
              description: 'CRS properties (e.g. {"name": "EPSG:4326"})',
            },
          }),
        })

        const GeoJSONInput = new GraphQLInputObjectType({
          name: 'GeoJSONInput',
          description: 'GeoJSON geometry representation',
          fields: () => ({
            type: {
              type: new GraphQLNonNull(GraphQLString),
              description: 'Geometry type (e.g. "Point", "LineString")',
            },
            coordinates: {
              type: new GraphQLNonNull(GraphQLJSON),
              description: 'Geometry coordinates array',
            },
            crs: {
              type: CRSInput,
              description: 'Coordinate Reference System metadata',
            },
          }),
        })

        // --- Handle Geometry Scalar type ---
        const jsonScalarTypeName = GraphQLJSON.name
        const geometryCodec = pgRegistry.pgCodecs.geometry
        if (geometryCodec) {
          const geometryScalarTypeName = GraphQLString.name
          setGraphQLTypeForPgCodec(geometryCodec, 'output', jsonScalarTypeName)
          setGraphQLTypeForPgCodec(geometryCodec, 'input', jsonScalarTypeName)
          console.log(
            `PgPostgisPlugin: Mapped SCALAR geometry codec to GraphQL '${geometryScalarTypeName}' type`
          )
        } else {
          console.warn(
            'PgPostgisPlugin: SCALAR geometry codec not found in registry during schema init.'
          )
        }

        // --- Handle Geography Scalar type ---
        const geographyCodec = pgRegistry.pgCodecs.geography
        if (geographyCodec) {
          const geographyScalarTypeName = GraphQLString.name
          setGraphQLTypeForPgCodec(geographyCodec, 'output', jsonScalarTypeName)
          setGraphQLTypeForPgCodec(geographyCodec, 'input', jsonScalarTypeName)
          console.log(
            `PgPostgisPlugin: Mapped SCALAR geography codec to GraphQL '${geographyScalarTypeName}' type.`
          )
        } else {
          console.warn(
            'PgPostgisPlugin: SCALAR geography codec not found in registry during schema init.'
          )
        }
        return _
      },
    },
  },
}
