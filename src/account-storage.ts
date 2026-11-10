let accountId: string | null = null
export function selectAccountStorage(user: { id: string; role: string }) {
  accountId = user.id
  // Existing calculator projects belong to the owner, never to a new invited member.
  if (user.role === 'owner') {
    try {
      for (const key of Object.keys(localStorage)) {
        if (!/^polymath-(studio-project|scientific-)/.test(key)) continue
        const target = `ivc-account:${user.id}:${key}`
        if (localStorage.getItem(target) === null)
          localStorage.setItem(target, localStorage.getItem(key)!)
        localStorage.removeItem(key)
      }
    } catch {
      /* Import/Save Project remains available when browser storage is restricted. */
    }
  }
}
export function accountStorageKey(key: string) {
  return accountId ? `ivc-account:${accountId}:${key}` : key
}
