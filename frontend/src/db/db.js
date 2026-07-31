import Dexie from 'dexie'

export const db = new Dexie('VaultDB')

// Stage 1 schema remains available for migration compatibility.
db.version(1).stores({
  passwords: 'id'
})

db.version(2).stores({
  passwords: 'id',
  notes: 'id',
  files: 'id'
})

// Stage 2 schema adds encrypted stores and vault metadata while keeping
// the legacy plaintext stores intact until migration completes.
db.version(3).stores({
  passwords: 'id',
  notes: 'id',
  files: 'id',
  encryptedPasswords: 'id',
  encryptedNotes: 'id',
  encryptedFiles: 'id',
  vaultMeta: 'id'
})
