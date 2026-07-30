import Dexie from 'dexie'

export const db = new Dexie('VaultDB')

// Stage 1 Schema:
// We only index the primary key 'id'.
// We do NOT index sensitive fields like name, username, or website,
// because in Stage 2 those will be encrypted, and we wouldn't be able
// to query them through IndexedDB anyway. We will load all records and
// filter them in-memory instead.
//
// Stage 1 Note: Passwords are stored in PLAINTEXT for this stage.
// Do NOT use this for real credentials yet.
db.version(1).stores({
  passwords: 'id'
})

db.version(2).stores({
  passwords: 'id',
  notes: 'id',
  files: 'id'
})
