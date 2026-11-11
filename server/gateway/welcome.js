import {
  authGet,
  getAuthSession,
  postAuth,
  isSessionRequired,
  welcomePath,
} from '/auth-client.js'
let session = null,
  invitation = null,
  sessionVersion = 0
const $ = (selector) => document.querySelector(selector)
const channel =
  typeof BroadcastChannel === 'function'
    ? new BroadcastChannel('ivc-session')
    : null
function feedback(message, error = false) {
  const el = $('#feedback')
  el.textContent = message
  el.classList.toggle('error', error)
  el.hidden = false
}
function clearSession() {
  sessionVersion++
  session = null
  for (const id of [
    '#admin-panel',
    '#password-panel',
    '#manage-access',
    '#logout',
    '#invitation-result',
  ])
    $(id).hidden = true
  $('#user-list').replaceChildren()
  $('#invitation-link').value = ''
  $('#invitation-code').value = ''
  $('#signed-in').textContent = ''
  $('#invite-user-form [name=currentPassword]').value = ''
  $('#password-form').reset()
  $('.workspace-entry').hidden = true
  for (const el of document.querySelectorAll(
    '.login-trigger,.hero-actions,.access-note',
  ))
    el.hidden = false
}
async function api(path, body) {
  const started = session
  try {
    return body === undefined
      ? await authGet(path)
      : await postAuth(path, body, started?.user.id)
  } catch (error) {
    if (isSessionRequired(error) && session === started) {
      clearSession()
      $('#access-panel').hidden = false
    }
    if (error.code === 'ACCOUNT_CHANGED') {
      clearSession()
      location.replace(welcomePath('/'))
    }
    throw error
  }
}
function scrollToPanel(id) {
  $(id).hidden = false
  $(id).scrollIntoView({
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'instant'
      : 'smooth',
    block: 'start',
  })
  $(id).querySelector('input:not([readonly])')?.focus({ preventScroll: true })
}
for (const button of document.querySelectorAll('.login-trigger'))
  button.addEventListener('click', () => scrollToPanel('#access-panel'))
$('#show-invitation').addEventListener('click', () =>
  scrollToPanel('#invitation-code-panel'),
)
function busy(form, value) {
  for (const button of form.querySelectorAll('button')) button.disabled = value
}
function submit(id, work) {
  $(id).addEventListener('submit', async (e) => {
    e.preventDefault()
    const form = e.currentTarget
    busy(form, true)
    try {
      await work(Object.fromEntries(new FormData(form)), form)
    } catch (error) {
      feedback(error.message, true)
    } finally {
      busy(form, false)
    }
  })
}
async function confirmLogin() {
  try {
    await readSessionData()
  } catch (error) {
    if (isSessionRequired(error))
      throw Error(
        '로그인 쿠키를 확인하지 못했습니다. 같은 HTTPS 주소를 사용하고 이 사이트의 쿠키 차단 설정을 확인하세요.',
      )
    throw error
  }
}
async function readSessionData(active = false) {
  return getAuthSession(active)
}
submit('#login-form', async (body) => {
  await api('/api/login', body)
  await confirmLogin()
  location.assign('/calculator')
})
function showInvitation(data) {
  invitation = data
  $('#invite-form [name=email]').value = data.email
  $('#invite-form [name=password]').value = ''
  $('#invite-form [name=confirm]').value = ''
  $('#invitation-expiry').textContent =
    `계정 설정: ${new Date(data.expires).toLocaleString('ko-KR')}까지. 시간이 지나면 원래 링크·코드를 다시 여세요.`
  $('#invitation-code-panel').hidden = true
  $('#access-panel').hidden = true
  scrollToPanel('#invite-panel')
}
async function beginInvitation(token) {
  const data = await api('/api/begin-invite', { token })
  // Only discard the URL secret after the server has stored an HttpOnly continuation cookie.
  history.replaceState(null, '', welcomePath('/'))
  $('#invitation-code-form').reset()
  showInvitation(data)
}
submit('#invitation-code-form', (body) => {
  let token = body.token.trim()
  if (/^https?:\/\//i.test(token)) {
    try {
      token =
        new URLSearchParams(new URL(token).hash.slice(1)).get('invite') || ''
    } catch {
      token = ''
    }
  }
  if (token.includes('@'))
    throw Error(
      '이메일을 입력하는 칸이 아닙니다. 관리자가 전달한 초대 링크 전체 또는 일회용 코드를 붙여넣으세요.',
    )
  if (!/^[\w-]{43}$/.test(token))
    throw Error(
      '초대 링크 또는 43자리 일회용 코드를 확인하세요. 관리자는 Manage Access에서 초대를 만든 후 Copy link로 전달할 수 있습니다.',
    )
  return beginInvitation(token)
})
submit('#invite-form', async (body) => {
  if (!invitation) throw Error('원래 초대 링크나 코드를 다시 여세요.')
  if (body.password !== body.confirm)
    throw Error('비밀번호가 일치하지 않습니다.')
  await api('/api/accept-invite', {
    email: body.email,
    password: body.password,
  })
  await confirmLogin()
  invitation = null
  $('#invite-form').reset()
  location.replace('/calculator')
})
async function loadUsers() {
  const id = session?.user.id
  const data = await api('/api/admin/users')
  if (!session || session.user.id !== id) return
  const list = $('#user-list')
  list.replaceChildren()
  for (const user of data.users) {
    const row = document.createElement('tr')
    for (const text of [
      user.email,
      user.role === 'owner' ? 'Super Admin' : 'Member',
      {
        active: 'Active',
        revoked: 'Revoked',
        invited: 'Invited',
        expired: 'Invitation expired',
      }[user.status],
    ]) {
      const td = document.createElement('td')
      td.textContent = text
      row.append(td)
    }
    const action = document.createElement('td')
    if (user.role !== 'owner') {
      function actionButton(label, name, work, confirmation) {
        const button = document.createElement('button')
        button.textContent = label
        button.setAttribute('aria-label', `${name} ${user.email}`)
        button.addEventListener('click', async () => {
          const input = $('#invite-user-form [name=currentPassword]')
          if (!input.value) {
            input.focus({ preventScroll: true })
            return feedback(
              'Admin Password에 현재 로그인한 관리자 본인의 비밀번호를 입력하세요.',
              true,
            )
          }
          if (confirmation && !confirm(confirmation)) return
          button.disabled = true
          try {
            await work(input.value)
            input.value = ''
            await loadUsers()
          } catch (e) {
            feedback(e.message, true)
          } finally {
            button.disabled = false
          }
        })
        action.append(button)
      }
      if (user.active)
        actionButton(
          'Revoke access',
          'Revoke',
          async (currentPassword) => {
            await api('/api/admin/revoke', { id: user.id, currentPassword })
            feedback('접근 권한과 세션을 회수했습니다.')
          },
          `${user.email}의 접근 권한과 모든 기존 세션을 회수할까요?`,
        )
      const active = user.status === 'active'
      actionButton(
        active ? 'Reset account' : 'Reissue invitation',
        active ? 'Reset' : 'Reissue',
        async (currentPassword) => {
          const data = await api(
            active ? '/api/admin/reset' : '/api/admin/invite',
            {
              ...(active ? { id: user.id } : { email: user.email }),
              currentPassword,
            },
          )
          showIssuedInvitation(data)
        },
        active
          ? `${user.email}의 기존 비밀번호와 모든 세션을 폐기하고 재설정 초대를 만들까요?`
          : `새 초대를 만들면 ${user.email}의 이전 링크는 폐기됩니다. 계속할까요?`,
      )
    } else action.textContent = '—'
    row.append(action)
    list.append(row)
  }
}
function showIssuedInvitation(data) {
  $('#invitation-link').value = data.url
  $('#invitation-code').value = data.code
  $('#invitation-result').hidden = false
  feedback(
    '48시간 유효한 일회용 초대를 만들었습니다. 링크·코드를 해당 사용자에게 직접 전달하세요.',
  )
}
submit('#invite-user-form', async (body, form) => {
  const data = await api('/api/admin/invite', body)
  showIssuedInvitation(data)
  form.querySelector('[name=currentPassword]').value = ''
  await loadUsers()
})
async function checkSharing() {
  const id = session?.user.id,
    button = $('#check-sharing')
  button.disabled = true
  $('#sharing-state').textContent = 'Checking…'
  try {
    const data = await api('/api/admin/sharing')
    if (!session || session.user.id !== id) return
    $('#sharing-origin').value = data.entryUrl ?? data.origin
    $('#sharing-state').textContent = {
      ready: 'Server check passed',
      local: 'Local only',
      partial: 'API connected',
      blocked: 'External check blocked',
      mismatch: 'Address mismatch',
      unverified: 'Check incomplete',
      unavailable: 'Check unavailable',
    }[data.state]
    $('#sharing-panel').dataset.state = data.state
    $('#sharing-message').textContent = data.message
    const list = $('#sharing-checks')
    list.replaceChildren()
    const descriptions = {
      http: 'HTTP 응답 실패 또는 리디렉션',
      instance: '파일의 서버 ID가 상태 API와 다름 · 캐시 또는 전달 경로 확인',
      mime: '파일 유형이 예상과 다름',
      content: '예상한 페이지·파일 내용을 확인하지 못함',
      connection: '연결 실패 또는 검사 시간 초과',
    }
    for (const check of data.checks ?? []) {
      const item = document.createElement('li')
      item.textContent = `${check.path} · ${check.status ? `HTTP ${check.status}` : '응답 미확인'} · ${check.ok ? '확인됨' : (descriptions[check.issue] ?? '검사 미완료')}${check.note === 'instance-header-missing' ? ' · 서버 ID 헤더 없음(단독 실패 사유 아님)' : ''}`
      list.append(item)
    }
    $('#sharing-diagnostics').hidden = !list.children.length
  } catch (e) {
    $('#sharing-state').textContent = 'Check failed'
    feedback(e.message, true)
  } finally {
    button.disabled = false
  }
}
async function openManagement() {
  scrollToPanel('#admin-panel')
  await Promise.all([loadUsers(), checkSharing()])
}
$('#check-sharing').addEventListener('click', () => void checkSharing())
$('#refresh-users').addEventListener('click', () => {
  Promise.all([loadUsers(), checkSharing()]).catch((e) =>
    feedback(e.message, true),
  )
})
for (const [button, input] of [
  ['#copy-invitation', '#invitation-link'],
  ['#copy-code', '#invitation-code'],
]) {
  $(button).addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($(input).value)
      feedback('복사했습니다. 해당 사용자에게만 안전하게 전달하세요.')
    } catch {
      $(input).select()
      feedback('선택한 내용을 복사해서 안전하게 전달하세요.')
    }
  })
}
$('#manage-access').addEventListener('click', () =>
  openManagement().catch((e) => feedback(e.message, true)),
)
submit('#password-form', async (body, form) => {
  if (body.newPassword !== body.confirm)
    throw Error('비밀번호가 일치하지 않습니다.')
  await api('/api/change-password', body)
  form.reset()
  channel?.postMessage('logout')
  location.replace(welcomePath('/?changed=1'))
})
$('#logout').addEventListener('click', async () => {
  try {
    await api('/api/logout', {})
    channel?.postMessage('logout')
    location.replace(welcomePath('/' + location.hash))
  } catch (e) {
    feedback(e.message, true)
  }
})
let sessionCheck = null
function checkSession() {
  if (sessionCheck) return sessionCheck
  sessionCheck = updateSession().finally(() => {
    sessionCheck = null
  })
  return sessionCheck
}
let lastActivity = Date.now()
async function updateSession() {
  const version = ++sessionVersion
  try {
    const data = await readSessionData(Date.now() - lastActivity < 25_000)
    if (version !== sessionVersion) return
    if (session && session.user.id !== data.user.id) {
      location.reload()
      return
    }
    session = data
    for (const el of document.querySelectorAll(
      '.login-trigger,.hero-actions,.access-note',
    ))
      el.hidden = true
    $('.workspace-entry').hidden = false
    $('#access-panel').hidden = true
    $('#invitation-code-panel').hidden = true
    $('#signed-in').textContent = data.user.email
    $('#admin-identity').value = data.user.email
    $('#logout').hidden = false
    $('#password-panel').hidden = false
    $('#manage-access').hidden = data.user.role !== 'owner'
  } catch (error) {
    if (!isSessionRequired(error)) throw error
    if (version === sessionVersion && session) {
      clearSession()
      $('#access-panel').hidden = false
    }
  }
}
channel?.addEventListener('message', (event) => {
  if (event.data !== 'logout') return
  sessionVersion++
  $('#admin-panel').inert = true
  $('#password-panel').inert = true
  Promise.resolve(sessionCheck)
    .then(() => checkSession())
    .catch((e) => feedback(e.message, true))
    .finally(() => {
      $('#admin-panel').inert = false
      $('#password-panel').inert = false
    })
})
for (const event of ['pointerdown', 'keydown'])
  window.addEventListener(event, () => {
    lastActivity = Date.now()
  })
window.addEventListener('focus', () => {
  lastActivity = Date.now()
  checkSession().catch((e) => feedback(e.message, true))
})
window.addEventListener('pageshow', (event) => {
  if (event.persisted) location.reload()
})
setInterval(() => {
  if (document.visibilityState === 'visible' && session)
    checkSession().catch((e) => feedback(e.message, true))
}, 20_000)
async function initialize() {
  await checkSession()
  const token = new URLSearchParams(location.hash.slice(1)).get('invite')
  if (session) {
    if (new URLSearchParams(location.search).has('expired')) {
      const url = new URL(location.href)
      url.searchParams.delete('expired')
      history.replaceState(null, '', url.pathname + url.search + url.hash)
      feedback(
        '로그인이 유지되어 있습니다. Open Calculator로 작업을 계속하세요.',
      )
    }
    if (token)
      feedback(
        '이미 로그인되어 있습니다. 초대받은 계정으로 시작하려면 먼저 Log out을 누르세요.',
        true,
      )
    if (new URLSearchParams(location.search).has('account'))
      scrollToPanel('#password-panel')
    if (
      session.user.role === 'owner' &&
      new URLSearchParams(location.search).has('manage')
    )
      await openManagement()
  } else if (token) await beginInvitation(token)
  else {
    const resumed = await api('/api/invitation')
    if (resumed.invitation) return showInvitation(resumed.invitation)
    if (new URLSearchParams(location.search).has('changed')) {
      feedback('비밀번호를 변경했습니다. 다시 로그인하세요.')
      scrollToPanel('#access-panel')
    } else if (new URLSearchParams(location.search).has('expired')) {
      feedback(
        '세션이 만료되었거나 접근 권한이 변경되었습니다. 다시 로그인하세요.',
      )
      scrollToPanel('#access-panel')
    }
  }
}
initialize().catch((e) => {
  feedback(e.message, true)
  if (!session) scrollToPanel('#access-panel')
})
