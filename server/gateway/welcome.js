let session = null,
  invitation = null
const $ = (selector) => document.querySelector(selector)
function feedback(message, error = false) {
  const el = $('#feedback')
  el.textContent = message
  el.classList.toggle('error', error)
  el.hidden = false
}
async function api(path, body) {
  const response = await fetch(path, {
    method: body ? 'POST' : 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: body
      ? {
          'Content-Type': 'application/json',
          ...(session ? { 'X-CSRF-Token': session.csrf } : {}),
        }
      : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await response.json()
  if (!response.ok) throw Error(data.error ?? '요청에 실패했습니다.')
  return data
}
function scrollToPanel(id) {
  $(id).hidden = false
  $(id).scrollIntoView({
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'instant'
      : 'smooth',
    block: 'start',
  })
  $(id).querySelector('input')?.focus({ preventScroll: true })
}
for (const button of document.querySelectorAll('.login-trigger'))
  button.addEventListener('click', () => scrollToPanel('#access-panel'))
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
submit('#login-form', async (body) => {
  await api('/api/login', body)
  location.assign('/calculator')
})
submit('#invite-form', async (body, form) => {
  if (body.password !== body.confirm)
    throw Error('비밀번호가 일치하지 않습니다.')
  await api('/api/accept-invite', {
    token: invitation,
    email: body.email,
    password: body.password,
  })
  invitation = null
  form.reset()
  $('#invite-panel').hidden = true
  feedback('계정이 활성화되었습니다. 새 비밀번호로 로그인하세요.')
  scrollToPanel('#access-panel')
})
async function loadUsers() {
  const data = await api('/api/admin/users')
  const list = $('#user-list')
  list.replaceChildren()
  for (const user of data.users) {
    const row = document.createElement('tr')
    for (const text of [
      user.email,
      user.role === 'owner' ? 'Super Admin' : 'Member',
      !user.active ? 'Revoked' : user.activated ? 'Allowed' : 'Invited',
    ]) {
      const td = document.createElement('td')
      td.textContent = text
      row.append(td)
    }
    const action = document.createElement('td')
    if (user.role !== 'owner' && user.active) {
      const button = document.createElement('button')
      button.textContent = 'Revoke access'
      button.setAttribute('aria-label', `Revoke ${user.email}`)
      button.addEventListener('click', async () => {
        const input = $('#invite-user-form input[name=currentPassword]')
        if (!input.value) {
          input.focus()
          return feedback(
            'Admin Password에 현재 비밀번호를 입력한 뒤 회수하세요.',
            true,
          )
        }
        if (!confirm(`${user.email}의 접근 권한과 기존 세션을 회수할까요?`))
          return
        button.disabled = true
        try {
          await api('/api/admin/revoke', {
            id: user.id,
            currentPassword: input.value,
          })
          input.value = ''
          await loadUsers()
          feedback('접근 권한과 세션을 회수했습니다.')
        } catch (e) {
          feedback(e.message, true)
        } finally {
          button.disabled = false
        }
      })
      action.append(button)
    } else action.textContent = '—'
    row.append(action)
    list.append(row)
  }
}
submit('#invite-user-form', async (body, form) => {
  const data = await api('/api/admin/invite', body)
  $('#invitation-link').value = data.url
  $('#invitation-result').hidden = false
  form.querySelector('[name=currentPassword]').value = ''
  await loadUsers()
  feedback('48시간 유효한 일회용 초대를 만들었습니다.')
})
$('#refresh-users').addEventListener('click', () =>
  loadUsers().catch((e) => feedback(e.message, true)),
)
$('#copy-invitation').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('#invitation-link').value)
    feedback('초대 링크를 복사했습니다.')
  } catch {
    $('#invitation-link').select()
    feedback('링크를 선택했습니다. 복사해서 안전하게 전달하세요.')
  }
})
$('#manage-access').addEventListener('click', () => {
  scrollToPanel('#admin-panel')
  loadUsers().catch((e) => feedback(e.message, true))
})
submit('#password-form', async (body, form) => {
  if (body.newPassword !== body.confirm)
    throw Error('비밀번호가 일치하지 않습니다.')
  await api('/api/change-password', body)
  form.reset()
  location.replace('/?changed=1')
})
$('#logout').addEventListener('click', async () => {
  try {
    await api('/api/logout', {})
    new BroadcastChannel('ivc-session').postMessage('logout')
    location.replace('/')
  } catch (e) {
    feedback(e.message, true)
  }
})
async function initialize() {
  const hash = new URLSearchParams(location.hash.slice(1))
  invitation = hash.get('invite')
  if (invitation) {
    history.replaceState(null, '', '/')
    scrollToPanel('#invite-panel')
  }
  try {
    session = await api('/api/session')
  } catch {
    session = null
  }
  if (session) {
    for (const el of document.querySelectorAll(
      '.login-trigger,.hero-actions,.access-note',
    ))
      el.hidden = true
    $('.workspace-entry').hidden = false
    $('#signed-in').textContent = session.user.email
    $('#logout').hidden = false
    $('#password-panel').hidden = false
    if (new URLSearchParams(location.search).has('account'))
      scrollToPanel('#password-panel')
    if (session.user.role === 'owner') {
      $('#manage-access').hidden = false
      if (new URLSearchParams(location.search).has('manage')) {
        scrollToPanel('#admin-panel')
        await loadUsers()
      }
    }
  } else if (new URLSearchParams(location.search).has('changed')) {
    feedback('비밀번호를 변경했습니다. 다시 로그인하세요.')
    scrollToPanel('#access-panel')
  } else if (new URLSearchParams(location.search).has('expired')) {
    feedback(
      '세션이 만료되었거나 접근 권한이 변경되었습니다. 다시 로그인하세요.',
    )
    scrollToPanel('#access-panel')
  }
}
initialize().catch(() =>
  feedback('서버에 연결하지 못했습니다. 잠시 후 새로고침하세요.', true),
)
