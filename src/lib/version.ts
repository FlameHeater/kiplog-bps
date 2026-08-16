// DEP-06 — keep in sync with package.json "version". Bumped manually per
// release until the /ship-style tooling in later phases automates it.
export const APP_VERSION = '0.1.0';

// FR-DAT-10 — bump whenever AppSettings/backup payload shape changes in a
// way that needs a migration. Single source of truth (was duplicated
// locally in AppSettingsForm/seed-default-settings/backup.ts).
export const SCHEMA_VERSION = 1;
