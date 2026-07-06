import { describe, expect, it, vi } from 'vitest'
import {
  checkDisplayNameAvailability,
  loadOwnProfile,
  requestPasswordReset,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  updateOwnDisplayName,
  updatePassword,
} from '../euroAuthService.js'

function createClient() {
  const profile = {
    id: 'user-1',
    display_name: 'Nicky Gregal',
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
  }
  const single = vi.fn().mockResolvedValue({ data: profile, error: null })
  const select = vi.fn(() => ({ single }))
  const from = vi.fn(() => ({ select }))
  const rpc = vi.fn(async (name) => {
    if (name === 'is_display_name_available') return { data: true, error: null }
    if (name === 'update_my_profile_display_name') {
      return { data: [{ ...profile, display_name: 'Nicky Updated' }], error: null }
    }
    throw new Error(`Unexpected RPC ${name}`)
  })
  const auth = {
    signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' }, session: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
    updateUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  }

  return { auth, rpc, from, select, single }
}

describe('Euro authentication service', () => {
  it('checks display-name availability through the narrow RPC', async () => {
    const client = createClient()
    await expect(checkDisplayNameAvailability(client, '  Nicky   Gregal ')).resolves.toBe(true)
    expect(client.rpc).toHaveBeenCalledWith('is_display_name_available', {
      candidate: 'Nicky Gregal',
    })
  })

  it('registers with validated display-name metadata', async () => {
    const client = createClient()
    await signUpWithEmail(client, {
      email: 'NICKY@example.com',
      password: 'password123',
      displayName: 'Nicky Gregal',
      redirectTo: 'https://example.test/',
    })

    expect(client.auth.signUp).toHaveBeenCalledWith({
      email: 'nicky@example.com',
      password: 'password123',
      options: {
        emailRedirectTo: 'https://example.test/',
        data: { display_name: 'Nicky Gregal' },
      },
    })
  })


  it('rejects moderated names before Auth sign-up', async () => {
    const client = createClient()

    await expect(signUpWithEmail(client, {
      email: 'nicky@example.com',
      password: 'password123',
      displayName: 'Stop the boats',
      redirectTo: 'https://example.test/',
    })).rejects.toThrow('mixed football audience')
    expect(client.auth.signUp).not.toHaveBeenCalled()
  })

  it('rejects registration before Auth when a name is unavailable', async () => {
    const client = createClient()
    client.rpc.mockResolvedValueOnce({ data: false, error: null })

    await expect(signUpWithEmail(client, {
      email: 'nicky@example.com',
      password: 'password123',
      displayName: 'Taken Name',
      redirectTo: 'https://example.test/',
    })).rejects.toThrow('already in use')
    expect(client.auth.signUp).not.toHaveBeenCalled()
  })

  it('signs in with a normalised email address', async () => {
    const client = createClient()
    await signInWithEmail(client, { email: 'NICKY@example.com', password: 'password123' })
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'nicky@example.com',
      password: 'password123',
    })
  })

  it('requests recovery with the supplied callback URL', async () => {
    const client = createClient()
    await requestPasswordReset(client, {
      email: 'nicky@example.com',
      redirectTo: 'https://example.test/?auth=update-password',
    })
    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'nicky@example.com',
      { redirectTo: 'https://example.test/?auth=update-password' },
    )
  })

  it('updates the password through Supabase Auth', async () => {
    const client = createClient()
    await updatePassword(client, 'new-password')
    expect(client.auth.updateUser).toHaveBeenCalledWith({ password: 'new-password' })
  })

  it('reads only the current profile through RLS', async () => {
    const client = createClient()
    await expect(loadOwnProfile(client)).resolves.toMatchObject({ display_name: 'Nicky Gregal' })
    expect(client.from).toHaveBeenCalledWith('profiles')
    expect(client.select).toHaveBeenCalledWith('id,display_name,created_at,updated_at')
  })

  it('renames through the controlled RPC rather than a table update', async () => {
    const client = createClient()
    await expect(updateOwnDisplayName(client, 'Nicky Updated')).resolves.toMatchObject({
      display_name: 'Nicky Updated',
    })
    expect(client.rpc).toHaveBeenCalledWith('update_my_profile_display_name', {
      candidate: 'Nicky Updated',
    })
  })

  it('signs out without touching guest storage', async () => {
    const client = createClient()
    await signOut(client)
    expect(client.auth.signOut).toHaveBeenCalledTimes(1)
  })
})
