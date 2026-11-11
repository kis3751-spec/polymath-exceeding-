export type AuthSession = {
  user: { id: string; email: string; role: 'owner' | 'member' }
  csrf: string
  expiresAt?: number
}
export function isSessionRequired(error: unknown): boolean
export function createAuthRequests(fetchImpl?: typeof fetch): {
  get(path: string, active?: boolean): Promise<unknown>
  session(active?: boolean): Promise<AuthSession>
  post(
    path: string,
    body: Record<string, unknown>,
    expectedUserId?: string,
  ): Promise<unknown>
}
export function authGet(path: string, active?: boolean): Promise<unknown>
export function getAuthSession(active?: boolean): Promise<AuthSession>
export function postAuth(
  path: string,
  body: Record<string, unknown>,
  expectedUserId?: string,
): Promise<unknown>

export function welcomePath(path?: string, stamp?: string): string
