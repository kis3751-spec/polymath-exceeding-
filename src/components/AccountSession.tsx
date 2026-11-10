import { useEffect, useRef, useState, type ReactNode } from 'react'
import { selectAccountStorage } from '../account-storage'
import './AccountSession.css'
type Session = {
  user: { id: string; email: string; role: 'owner' | 'member' }
  csrf: string
}
export default function AccountSession({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [error, setError] = useState('')
  const current = useRef<Session | null>(null),
    lastActivity = useRef(Date.now()),
    version = useRef(0)
  useEffect(() => {
    let alive = true
    async function check() {
      const request = ++version.current
      try {
        const response = await fetch('/ivc-auth/session', {
          credentials: 'same-origin',
          cache: 'no-store',
          headers:
            Date.now() - lastActivity.current < 25_000
              ? { 'X-IVC-Active': '1' }
              : {},
        })
        if (!alive || request !== version.current) return
        if (response.status === 401) {
          setSession(null)
          location.replace('/?expired=1')
          return
        }
        if (!response.ok) throw Error('서버 연결을 확인할 수 없습니다.')
        const data = (await response.json()) as Session
        if (!alive || request !== version.current) return
        if (!data.user?.id || !data.csrf)
          throw Error('인증 확인에 실패했습니다.')
        if (current.current && current.current.user.id !== data.user.id) {
          setSession(null)
          location.replace('/calculator')
          return
        }
        selectAccountStorage(data.user)
        current.current = data
        setSession(data)
        setError('')
      } catch {
        if (alive && request === version.current) {
          setSession(null)
          setError(
            '세션을 확인할 수 없어 작업 화면을 잠갔습니다. 연결을 확인하고 다시 접속하세요.',
          )
        }
      }
    }
    const activity = () => {
      lastActivity.current = Date.now()
    }
    const focus = () => {
      activity()
      void check()
    }
    const channel = new BroadcastChannel('ivc-session')
    channel.onmessage = () => {
      version.current++
      setSession(null)
      location.replace('/')
    }
    const pageshow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setSession(null)
        location.reload()
      }
    }
    window.addEventListener('pointerdown', activity)
    window.addEventListener('keydown', activity)
    window.addEventListener('focus', focus)
    window.addEventListener('pageshow', pageshow)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void check()
    }, 20_000)
    void check()
    return () => {
      alive = false
      version.current++
      clearInterval(interval)
      channel.close()
      window.removeEventListener('pointerdown', activity)
      window.removeEventListener('keydown', activity)
      window.removeEventListener('focus', focus)
      window.removeEventListener('pageshow', pageshow)
    }
  }, [])
  async function logout() {
    if (!session) return
    version.current++
    setSession(null)
    try {
      const response = await fetch('/ivc-auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': session.csrf,
        },
        body: '{}',
      })
      if (!response.ok) throw Error('logout')
      new BroadcastChannel('ivc-session').postMessage('logout')
      location.replace('/')
    } catch {
      setError(
        '서버 로그아웃을 확인하지 못했습니다. 연결 후 다시 로그인해 로그아웃하세요.',
      )
    }
  }
  if (!session)
    return (
      <div className="account-lock" role="status">
        <strong>IVC</strong>
        <p>{error || '사용 권한을 확인하고 있습니다.'}</p>
        {error && <a href="/">Log in again</a>}
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
      {children}
    </>
  )
}
