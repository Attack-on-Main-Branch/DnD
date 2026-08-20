import { CHANGELOG } from "@/app/components/changelog";

/**
 * What the app says about itself when it has just been deployed.
 *
 * The version is the changelog's own top entry rather than a `package.json`
 * import — the ledger is where a release is decided, and reading it here is
 * what keeps a deployed build from announcing a number nobody wrote an entry
 * for. `announce_version` refuses anything that is not three numbers, so an
 * entry with a malformed version simply goes unannounced.
 *
 * The copy is here, in Maria, and travels to the database as a parameter: the
 * row is addressed to the caller themselves, so there is nobody else to put
 * words in front of. An invitation is the opposite case and is assembled in
 * SQL — see the migration.
 */
export const CURRENT_RELEASE = CHANGELOG[0];

export function versionNotice(entry = CURRENT_RELEASE) {
  return {
    version: entry.version,
    title: `New Grimoire Version (v${entry.version})`,
    message: `${entry.title} — open the grimoire to read what this release brought.`,
  };
}
