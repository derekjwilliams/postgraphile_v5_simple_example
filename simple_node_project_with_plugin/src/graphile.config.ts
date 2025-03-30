import 'graphile-config'
import 'postgraphile'
import { PostGraphileAmberPreset } from 'postgraphile/presets/amber'
import { makePgService } from 'postgraphile/adaptors/pg'
import { PgSimplifyInflectionPreset } from '@graphile/simplify-inflection'
import { PgManyToManyPreset } from '@graphile-contrib/pg-many-to-many'
// import { PgPostgisWktPlugin } from 'postgraphile-postgis-wkt' // From npm
//optional
import { PgPostgisWktPlugin } from './plugins/PgPostgisWktPlugin.js' // local
// import { PgPostgisPlugin } from './plugins/PgPostgisPlugin.js'

const preset: GraphileConfig.Preset = {
  extends: [
    PostGraphileAmberPreset,
    // PgSimplifyInflectionPreset,
    // PgManyToManyPreset,
  ],
  // plugins: [PgPostgisPlugin], //Plugin is optional, remove if you don't need PostGIS support
  plugins: [PgPostgisWktPlugin], //Plugin is optional, remove if you don't need PostGIS support
  pgServices: [
    makePgService({
      connectionString: process.env.DB_CONNECTION,
      schemas: [process.env.DB_SCHEMA || 'public'],
    }),
  ],
  grafast: {
    explain: true,
  },
}

export default preset
