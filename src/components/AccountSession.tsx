import { useEffect, useRef, useState, type ReactNode } from 'react'
import { selectAccountStorage } from '../account-storage'
import {
  getAuthSession,
  postAuth,
  isSessionRequired,
  type AuthSession,
} from '../../server/gateway/auth-client.js'
import './AccountSession.css'
export default function AccountSession({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null),
    [error, setError] = useState('')
  const current = useRef<AuthSession | null>(null),
    lastActivity = useRef(Date.now()),
    version = useRef(0)
  const retry = useRef<() => void>(() => {}),
    channelRef = useRef<BroadcastChannel | null>(null),
    loggingOut = useRef(false)
  useEffect(() => {
    let alive = true,
      pending: Promise<void> | null = null,
      retryTimer: ReturnType<typeof setTimeout> | undefined
    const endSession = () => {
      current.current = null
      setSession(null)
      location.replace('/?expired=1')
    }
    async function run() {
      const request = ++version.current
      try {
        const data = await getAuthSession(
          Date.now() - lastActivity.current < 25_000,
        )
        if (!alive || request !== version.current) return
        if (current.current && current.current.user.id !== data.user.id) {
          setSession(null)
          location.replace('/calculator')
          return
        }
        selectAccountStorage(data.user)
        current.current = data
        setSession(data)
        setError('')
        clearTimeout(retryTimer)
      } catch (failure) {
        if (!alive || request !== version.current) return
        if (isSessionRequired(failure)) {
          endSession()
          return
        }
        // A network/proxy error does not prove that this server session expired.
        // Cover the existing workspace while rechecking, preserving model state.
        setError(
          '서버 연결을 다시 확인하고 있습니다. 작성 중인 모델은 유지됩니다.',
        )
        clearTimeout(retryTimer)
        retryTimer = setTimeout(() => {
          if (document.visibilityState === 'visible') void check()
        }, 3000)
      }
    }
    function check() {
      if (loggingOut.current) return Promise.resolve()
      if (!pending)
        pending = run().finally(() => {
          pending = null
        })
      return pending
    }
    retry.current = () => {
      void check()
    }
    const activity = () => {
      lastActivity.current = Date.now()
    }
    const focus = () => {
      activity()
      void check()
    }
    const channel =
      typeof BroadcastChannel === 'function'
        ? new BroadcastChannel('ivc-session')
        : null
    channelRef.current = channel
    if (channel)
      channel.onmessage = (event) => {
        if (event.data !== 'logout') return
        // Notifications can arrive after a newer login in another tab. The
        // server, rather than the age/order of a tab message, decides expiry.
        version.current++
        setError('다른 탭의 로그인 변경을 확인하고 있습니다.')
        if (pending) void pending.then(() => check())
        else void check()
      }
    const pageshow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setError('로그인 상태를 다시 확인하고 있습니다.')
        void check()
      }
    }
    const visibility = () => {
      if (document.visibilityState === 'visible') focus()
    }
    window.addEventListener('pointerdown', activity)
    window.addEventListener('keydown', activity)
    window.addEventListener('focus', focus)
    window.addEventListener('pageshow', pageshow)
    document.addEventListener('visibilitychange', visibility)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void check()
    }, 20_000)
    void check()
    return () => {
      alive = false
      version.current++
      clearTimeout(retryTimer)
      clearInterval(interval)
      channel?.close()
      channelRef.current = null
      window.removeEventListener('pointerdown', activity)
      window.removeEventListener('keydown', activity)
      window.removeEventListener('focus', focus)
      window.removeEventListener('pageshow', pageshow)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])
  async function logout() {
    const active = current.current
    if (!active || loggingOut.current) return
    loggingOut.current = true
    version.current++
    setError('로그아웃을 확인하고 있습니다.')
    try {
      await postAuth('/api/logout', {}, active.user.id)
      channelRef.current?.postMessage('logout')
      current.current = null
      setSession(null)
      location.replace('/')
    } catch (failure) {
      if (
        isSessionRequired(failure) ||
        (failure as { code?: string }).code === 'ACCOUNT_CHANGED'
      ) {
        current.current = null
        setSession(null)
        location.replace('/')
        return
      }
      setError(
        '로그아웃 완료를 확인하지 못했습니다. 연결을 확인한 뒤 다시 확인을 누르세요.',
      )
    } finally {
      loggingOut.current = false
    }
  }
  if (!session)
    return (
      <div className="account-lock" role="status">
        <strong>IVC</strong>
        <p>{error || '사용 권한을 확인하고 있습니다.'}</p>
        {error && (
          <>
            <button onClick={() => retry.current()}>다시 확인</button>
            <a href="/">Log in</a>
          </>
        )}
      </div>
    )
  return (
    <>
      <div className="account-bar">
        <span>{session.user.email}</span>
        <a href={session.user.role === 'owner' ? '/?manage=1' : '/?account=1'}>
          {session.user.role === 'owner' ? 'Manage Access' : 'Account'}
        </a>
        <button onClick={() => void logout()}>Log out</button>
      </div>
      <div className="account-content" inert={Boolean(error)}>
        {children}
      </div>
      {error && (
        <div className="account-reconnect account-lock" role="status">
          <strong>IVC</strong>
          <p>{error}</p>
          <button onClick={() => retry.current()}>다시 확인</button>
        </div>
      )}
    </>
  )
}
