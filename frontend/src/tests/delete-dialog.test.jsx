/**
 * Regression tests for the delete-confirmation dialog state bug.
 *
 * The bug: onConfirm set isDeleting(true) and awaited onDelete, but never
 * reset isDeleting or closed the dialog. If onDelete rejected (e.g. the
 * backend returns 429 for the 30/minute delete rate limit, or a network
 * error), the dialog was stuck on "Processing..." forever with no way out
 * except a full page reload.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NoteDetail } from '../components/Vault/NoteDetail.jsx'
import { PasswordDetail } from '../components/Vault/PasswordDetail.jsx'
import { FileDetail } from '../components/Vault/FileDetail.jsx'

const baseItem = {
  id: 'item-1',
  title: 'My Title',
  name: 'My Name',
  username: 'user',
  content: 'Hello',
  mimeType: 'text/plain',
  size: 5,
  updatedAt: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
}

describe('Delete dialog never gets stuck on "Processing..."', () => {
  it('NoteDetail: closes the dialog and stops the spinner when delete FAILS', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn().mockRejectedValue(new Error('Rate limit exceeded'))

    render(<NoteDetail item={baseItem} onDelete={onDelete} onEdit={vi.fn()} onBack={vi.fn()} />)

    await user.click(screen.getByText('Delete'))
    expect(screen.getByText('Delete note?')).toBeInTheDocument()

    await user.click(screen.getByText('Delete', { selector: 'button[data-confirm]' }))

    // Dialog must disappear and the spinner must be gone after failure
    await waitFor(() => {
      expect(screen.queryByText('Processing...')).not.toBeInTheDocument()
    })
    expect(screen.queryByText('Delete note?')).not.toBeInTheDocument()
    expect(onDelete).toHaveBeenCalledWith('item-1')
  })

  it('NoteDetail: closes the dialog and stops the spinner when delete SUCCEEDS', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn().mockResolvedValue(undefined)

    render(<NoteDetail item={baseItem} onDelete={onDelete} onEdit={vi.fn()} onBack={vi.fn()} />)

    await user.click(screen.getByText('Delete'))
    await user.click(screen.getByText('Delete', { selector: 'button[data-confirm]' }))

    await waitFor(() => {
      expect(screen.queryByText('Processing...')).not.toBeInTheDocument()
    })
    expect(screen.queryByText('Delete note?')).not.toBeInTheDocument()
  })

  it('PasswordDetail: closes the dialog and stops the spinner when delete FAILS', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn().mockRejectedValue(new Error('Network error'))

    render(<PasswordDetail item={baseItem} onDelete={onDelete} onEdit={vi.fn()} onBack={vi.fn()} />)

    await user.click(screen.getByText('Delete'))
    await user.click(screen.getByText('Delete', { selector: 'button[data-confirm]' }))

    await waitFor(() => {
      expect(screen.queryByText('Processing...')).not.toBeInTheDocument()
    })
    expect(screen.queryByText('Delete password?')).not.toBeInTheDocument()
    expect(onDelete).toHaveBeenCalledWith('item-1')
  })

  it('FileDetail: closes the dialog and stops the spinner when delete FAILS', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn().mockRejectedValue(new Error('Server error'))

    render(<FileDetail item={baseItem} onDelete={onDelete} onBack={vi.fn()} />)

    await user.click(screen.getByText('Delete'))
    await user.click(screen.getByText('Delete', { selector: 'button[data-confirm]' }))

    await waitFor(() => {
      expect(screen.queryByText('Processing...')).not.toBeInTheDocument()
    })
    expect(screen.queryByText('Delete file?')).not.toBeInTheDocument()
    expect(onDelete).toHaveBeenCalledWith('item-1')
  })
})
