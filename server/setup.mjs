import { resolve } from 'node:path'
import { AccessStore } from './store.mjs'
const email = process.env.IVC_ADMIN_EMAIL ?? 'eerrtteerrt12@gmail.com'
const store = new AccessStore(
  resolve(process.env.IVC_DATA_DIR ?? '.ivc-data', 'access.sqlite'),
)
if (store.owner()) {
  console.error(
    '최고 관리자가 이미 설정되어 있습니다. 기존 계정으로 로그인하세요.',
  )
  store.close()
  process.exit(1)
}
let password = process.env.IVC_ADMIN_PASSWORD
if (!password) {
  if (!process.stdin.isTTY)
    throw Error(
      '터미널에서 실행하거나 IVC_ADMIN_PASSWORD 서버 비밀값을 설정하세요.',
    )
  // Raw mode prevents terminal echo and avoids putting credentials in command history.
  async function readSecret(prompt) {
    process.stdout.write(prompt)
    process.stdin.setRawMode(true)
    process.stdin.resume()
    let value = ''
    return new Promise((resolve, reject) => {
      const onData = (chunk) => {
        for (const char of chunk.toString()) {
          if (char === '\u0003') {
            cleanup()
            reject(Error('설정을 취소했습니다.'))
            return
          }
          if (char === '\r' || char === '\n') {
            cleanup()
            resolve(value)
            return
          }
          if (char === '\u007f' || char === '\b') value = value.slice(0, -1)
          else if (char >= ' ' && value.length < 128) value += char
        }
      }
      function cleanup() {
        process.stdin.off('data', onData)
        process.stdin.setRawMode(false)
        process.stdin.pause()
        process.stdout.write('\n')
      }
      process.stdin.on('data', onData)
    })
  }
  password = await readSecret(`${email} 최고 관리자 비밀번호 (입력 숨김): `)
  const confirm = await readSecret('비밀번호 확인: ')
  if (password !== confirm) throw Error('비밀번호가 일치하지 않습니다.')
}
try {
  await store.bootstrap(email, password)
  console.log('최고 관리자 설정 완료. 비밀번호 원문은 저장하지 않았습니다.')
} finally {
  password = undefined
  delete process.env.IVC_ADMIN_PASSWORD
  store.close()
}
