/**
 * Integration tests for vaultService using fake-indexeddb.
 * Exercises the real Dexie implementation instead of mocks,
 * catching any bare variable references that JSDOM+vi.mock would miss.
 */
import { describe, it, expect } from 'vitest'
import { initializeOrUnlockVault, getVaultSnapshot } from '../vault/vaultService.js'

describe('Vault Service Integration (Real DB)', () => {
  it('can initialize a vault then unlock it without any ReferenceError', async () => {
    const password = 'mySecretPassword123'
    const email = 'real_db_test@example.com'

    // First call: no vaultMeta exists yet → creates a new vault
    const createdResult = await initializeOrUnlockVault(password, email)
    expect(createdResult.ok).toBe(true)
    expect(createdResult.created).toBe(true)

    // Second call: vaultMeta now exists → unlocks existing vault
    // This exercises the full unlockVault path through real IndexedDB
    const unlockedResult = await initializeOrUnlockVault(password, email)
    expect(unlockedResult.ok).toBe(true)
    expect(unlockedResult.session).toBeDefined()
    expect(unlockedResult.session.db).toBeDefined()

    // Verify the session is wired up so that getDb()-dependent functions work
    const snapshot = await getVaultSnapshot()
    expect(snapshot.meta).toBeDefined()
    expect(snapshot.session).toBeDefined()
  })
})
