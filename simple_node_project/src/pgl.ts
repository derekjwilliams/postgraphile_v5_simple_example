//pgl.ts
import preset from './graphile.config.js'
import { postgraphile } from 'postgraphile'

// Our PostGraphile instance:
export const pgl = postgraphile(preset)
