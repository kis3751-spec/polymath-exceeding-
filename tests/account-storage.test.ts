import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { accountStorageKey, selectAccountStorage } from '../src/account-storage'
beforeEach(() => {
  const values = new Map<string, string>()
  const storage: Record<string, unknown> = {}
  Object.defineProperties(storage, {
    getItem: { value: (key: string) => values.get(key) ?? null },
    setItem: {
      value: (key: string, value: string) => {
        values.set(key, value)
        Object.defineProperty(storage, key, {
          value,
          enumerable: true,
          configurable: true,
        })
      },
    },
    removeItem: {
      value: (key: string) => {
        values.delete(key)
        delete storage[key]
      },
    },
  })
  vi.stubGlobal('localStorage', storage)
})
afterEach(() => vi.unstubAllGlobals())
it('invited users never inherit the former unauthenticated projects; owner migration preserves them', () => {
  const key = 'polymath-studio-project-v1'
  localStorage.setItem(key, 'private legacy model')
  selectAccountStorage({ id: 'member', role: 'member' })
  expect(localStorage.getItem(accountStorageKey(key))).toBeNull()
  selectAccountStorage({ id: 'owner', role: 'owner' })
  expect(localStorage.getItem(accountStorageKey(key))).toBe(
    'private legacy model',
  )
  expect(localStorage.getItem(key)).toBeNull()
})
it('switching users on one browser preserves independent saved projects', () => {
  const key = 'polymath-scientific-ode-v1'
  selectAccountStorage({ id: 'owner', role: 'owner' })
  localStorage.setItem(accountStorageKey(key), 'owner model')
  selectAccountStorage({ id: 'member', role: 'member' })
  expect(localStorage.getItem(accountStorageKey(key))).toBeNull()
  localStorage.setItem(accountStorageKey(key), 'member model')
  selectAccountStorage({ id: 'owner', role: 'owner' })
  expect(localStorage.getItem(accountStorageKey(key))).toBe('owner model')
  selectAccountStorage({ id: 'member', role: 'member' })
  expect(localStorage.getItem(accountStorageKey(key))).toBe('member model')
})
