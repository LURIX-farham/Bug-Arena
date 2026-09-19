import { getDataVersion, setDataVersion } from './dataProvider.js'
import { getIdentity } from './identityStore.js'

const CURRENT_SCHEMA_VERSION = 2

export function runMigrations() {
  const current = getDataVersion()
  if (current >= CURRENT_SCHEMA_VERSION) return { from: current, to: current, migrated: false }

  // v2 introduces a stable local identity and online-ready data contracts.
  if (current < 2) getIdentity()

  setDataVersion(CURRENT_SCHEMA_VERSION)
  return { from: current, to: CURRENT_SCHEMA_VERSION, migrated: true }
}

export { CURRENT_SCHEMA_VERSION }
