/** Never treat an empty/HTML proxy response as successful authentication. */
export async function responseData(response, path) {
  function failure(message, code) {
    return Object.assign(new Error(message), { status: response.status, code })
  }
  const text = await response.text()
  let data
  if (text.trim()) {
    try {
      data = JSON.parse(text)
    } catch {
      /* The forwarder can return an HTML sign-in or error page. */
    }
  }
  if (!response.ok) {
    if (data && typeof data.error === 'string')
      throw failure(data.error, data.code)
    if (
      response.status === 401 &&
      path === '/api/login' &&
      response.headers.get('x-ivc-response') === 'json'
    )
      throw failure('이메일 또는 비밀번호를 확인하세요. (HTTP 401)')
    if (response.status === 429)
      throw failure(
        '로그인 시도가 많습니다. 잠시 후 다시 시도하세요. (HTTP 429)',
      )
    throw failure(
      `로그인 서버의 응답을 확인할 수 없습니다. Codespaces 포트 접근 권한과 서버 실행 상태를 확인하세요. (HTTP ${response.status})`,
    )
  }
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw failure(
      `서버가 비어 있거나 올바르지 않은 응답을 보냈습니다. 새로고침 후 다시 시도하세요. (HTTP ${response.status})`,
    )
  return data
}
