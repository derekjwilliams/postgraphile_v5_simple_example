import 'graphile-config'
import 'postgraphile'
import { PostGraphileAmberPreset } from 'postgraphile/presets/amber'
import { makePgService } from 'postgraphile/adaptors/pg'
import { PgSimplifyInflectionPreset } from '@graphile/simplify-inflection'
import { PgManyToManyPreset } from '@graphile-contrib/pg-many-to-many'

const preset: GraphileConfig.Preset = {
  extends: [
    PostGraphileAmberPreset,
    PgSimplifyInflectionPreset,
    PgManyToManyPreset,
  ],
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
