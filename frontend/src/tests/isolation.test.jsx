import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  deriveEmailHash,
  initializeOrUnlockVault,
  saveVaultItem,
  loadVaultItems,
  clearActiveVaultSession
} from '../vault/vaultService.js'

describe('Vault Account Isolation', () => {
  beforeEach(() => {
    clearActiveVaultSession()
  })

  it('isolates vault data between two accounts', async () => {
    const passwordA = 'password-a'
    const emailA = 'accountA@example.com'
    const passwordB = 'password-b'
    const emailB = 'accountB@example.com'

    // 1. Log in as account A
    const unlockA = await initializeOrUnlockVault(passwordA, emailA)
    expect(unlockA.ok).toBe(true)

    // 2. Save one vault entry
    const itemA = { type: 'password', name: 'My Bank', username: 'alice' }
    await saveVaultItem(itemA)

    // Verify A has 1 item
    const itemsA = await loadVaultItems(unlockA.session.key)
    expect(itemsA.length).toBe(1)
    expect(itemsA[0].name).toBe('My Bank')

    // 3. Log out
    clearActiveVaultSession()

    // 4. Log in as account B
    const unlockB = await initializeOrUnlockVault(passwordB, emailB)
    expect(unlockB.ok).toBe(true)

    // 5. Confirm A's entry is NOT visible
    const itemsB = await loadVaultItems(unlockB.session.key)
    expect(itemsB.length).toBe(0)

    // Add an item for B just to be sure
    await saveVaultItem({ type: 'note', title: 'Secret Note for B' })

    // 6. Log out
    clearActiveVaultSession()

    // 7. Log back into A
    const unlockA2 = await initializeOrUnlockVault(passwordA, emailA)
    expect(unlockA2.ok).toBe(true)

    // 8. Confirm A's entry is still there, and B's is NOT there
    const itemsA2 = await loadVaultItems(unlockA2.session.key)
    expect(itemsA2.length).toBe(1)
    expect(itemsA2[0].name).toBe('My Bank')
  })
})
