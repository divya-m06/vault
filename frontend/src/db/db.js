import Dexie from 'dexie'

// In-memory cache of DB instances by name
const dbInstances = {}

export function getVaultDB(emailHash) {
  if (!emailHash) throw new Error("Vault DB requires an email hash to initialize")
  
  const dbName = `VaultDB_${emailHash}`
  if (dbInstances[dbName]) {
    return dbInstances[dbName]
  }

  const db = new Dexie(dbName)
  
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

  dbInstances[dbName] = db
  return db
}

export function clearAllVaultDBs() {
  for (const name in dbInstances) {
    dbInstances[name].close()
    delete dbInstances[name]
  }
}
