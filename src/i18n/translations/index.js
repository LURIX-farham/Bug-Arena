/* =================================================================
   TRANSLATION CATALOG
   Sections live in focused files and are merged per language here.
   To add a new domain: create a file exporting { en: {...}, fa: {...} }
   and spread it below. `t(section, key)` reads from the merged object.
================================================================= */

import { core } from './core'
import { landing } from './landing'
import { community } from './community'
import { support } from './support'
import { duel } from './duel'

export const translations = {
  en: { ...core.en, ...landing.en, ...community.en, ...support.en, ...duel.en },
  fa: { ...core.fa, ...landing.fa, ...community.fa, ...support.fa, ...duel.fa },
}
