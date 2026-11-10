import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, chmodSync } from 'node:fs'
import { dirname } from 'node:path'
import {
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
  createHash,
} from 'node:crypto'
import { promisify } from 'node:util'
const rawDerive = promisify(scrypt)
let activeHashes = 0
const waiters = []
async function derive(...args) {
  if (activeHashes >= 2) {
    if (waiters.length >= 8) {
      const error = new Error('Busy')
      error.code = 'EBUSY'
      throw error
    }
    await new Promise((resolve) => waiters.push(resolve))
  } else activeHashes++
  try {
    return await rawDerive(...args)
  } finally {
    const next = waiters.shift()
    if (next) next()
    else activeHashes--
  }
}
export const digest = (value) =>
  createHash('sha256').update(value).digest('hex')
export const secret = () => randomBytes(32).toString('base64url')
export const normalizeEmail = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : ''
export const validEmail = (value) =>
  value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
export function validPassword(value) {
  return typeof value === 'string' && value.length >= 12 && value.length <= 128
}
export async function hashPassword(password) {
  const salt = randomBytes(24).toString('hex')
  const key = await derive(password, salt, 64, {
    N: 65536,
    r: 8,
    p: 1,
    maxmem: 128 * 1024 * 1024,
  })
  return `scrypt$65536$8$1$${salt}$${key.toString('hex')}`
}
export async function verifyPassword(password, encoded) {
  if (
    typeof password !== 'string' ||
    password.length > 128 ||
    typeof encoded !== 'string'
  )
    return false
  const [kind, n, r, p, salt, expected] = encoded.split('$')
  if (
    kind !== 'scrypt' ||
    n !== '65536' ||
    r !== '8' ||
    p !== '1' ||
    !/^[a-f0-9]{48}$/.test(salt ?? '') ||
    !/^[a-f0-9]{128}$/.test(expected ?? '')
  )
    return false
  const actual = await derive(password, salt, 64, {
    N: 65536,
    r: 8,
    p: 1,
    maxmem: 128 * 1024 * 1024,
  })
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'))
}
export class AccessStore {
  constructor(path, now = () => Date.now()) {
    if (path !== ':memory:') {
      mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
      chmodSync(dirname(path), 0o700)
    }
    this.db = new DatabaseSync(path)
    this.now = now
    if (path !== ':memory:') chmodSync(path, 0o600)
    this.db
      .exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=DELETE; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT, role TEXT NOT NULL CHECK(role IN ('owner','member')), active INTEGER NOT NULL DEFAULT 1, created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), csrf TEXT NOT NULL, created INTEGER NOT NULL, touched INTEGER NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS invites (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, time INTEGER NOT NULL, actor TEXT, action TEXT NOT NULL, target TEXT);
      CREATE INDEX IF NOT EXISTS session_user ON sessions(user_id);`)
  }
  query(sql, ...args) {
    return this.db.prepare(sql).get(...args)
  }
  run(sql, ...args) {
    return this.db.prepare(sql).run(...args)
  }
  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const result = fn()
      this.db.exec('COMMIT')
      return result
    } catch (e) {
      this.db.exec('ROLLBACK')
      throw e
    }
  }
  audit(actor, action, target = null) {
    this.run(
      'INSERT INTO audit(time,actor,action,target) VALUES(?,?,?,?)',
      this.now(),
      actor,
      action,
      target,
    )
  }
  async bootstrap(email, password) {
    email = normalizeEmail(email)
    if (!validEmail(email) || !validPassword(password))
      throw Error('유효한 이메일과 12~128자 비밀번호가 필요합니다.')
    if (this.owner())
      throw Error(
        '최고 관리자가 이미 설정되어 있습니다. 초기화로 덮어쓸 수 없습니다.',
      )
    const encoded = await hashPassword(password)
    return this.transaction(() => {
      if (this.owner()) throw Error('최고 관리자가 이미 설정되어 있습니다.')
      const id = randomUUID()
      this.run(
        'INSERT INTO users VALUES(?,?,?,?,?,?)',
        id,
        email,
        encoded,
        'owner',
        1,
        this.now(),
      )
      this.run('INSERT INTO config VALUES(?,?)', 'owner', id)
      this.audit(id, 'owner.bootstrap', id)
      return id
    })
  }
  owner() {
    return this.query("SELECT value FROM config WHERE key='owner'")?.value
  }
  isOwner(user) {
    return (
      user?.role === 'owner' && user.id === this.owner() && user.active === 1
    )
  }
  user(id) {
    return this.query('SELECT * FROM users WHERE id=?', id)
  }
  byEmail(email) {
    return this.query(
      'SELECT * FROM users WHERE email=?',
      normalizeEmail(email),
    )
  }
  allow(key, max, duration) {
    const now = this.now()
    this.run('DELETE FROM limits WHERE expires<=?', now)
    const row = this.query('SELECT * FROM limits WHERE key=?', key)
    if (!row || row.expires <= now) {
      this.run(
        'INSERT OR REPLACE INTO limits VALUES(?,?,?)',
        key,
        1,
        now + duration,
      )
      return true
    }
    if (row.count >= max) return false
    this.run('UPDATE limits SET count=count+1 WHERE key=?', key)
    return true
  }
  session(token, touch = false) {
    if (!/^[\w-]{43}$/.test(token ?? '')) return null
    const row = this.query(
      'SELECT s.*,u.email,u.role,u.active,u.password FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.hash=?',
      digest(token),
    )
    const now = this.now()
    if (
      !row ||
      row.active !== 1 ||
      row.expires <= now ||
      row.touched + 30 * 60_000 <= now
    ) {
      if (row) this.run('DELETE FROM sessions WHERE hash=?', row.hash)
      return null
    }
    if (touch && now - row.touched > 60_000)
      this.run('UPDATE sessions SET touched=? WHERE hash=?', now, row.hash)
    return { ...row, id: row.user_id }
  }
  createSession(user) {
    const token = secret(),
      csrf = secret(),
      now = this.now()
    this.run(
      'DELETE FROM sessions WHERE expires<=? OR touched<=?',
      now,
      now - 30 * 60_000,
    )
    this.run(
      'INSERT INTO sessions VALUES(?,?,?,?,?,?)',
      digest(token),
      user.id,
      csrf,
      now,
      now,
      now + 8 * 3600_000,
    )
    return { token, csrf }
  }
  invite(email, actor) {
    return this.transaction(() => {
      let user = this.byEmail(email)
      if (user?.role === 'owner')
        throw Error('최고 관리자 계정은 변경할 수 없습니다.')
      if (user?.active && user.password) throw Error('이미 허용된 계정입니다.')
      if (!user) {
        const id = randomUUID()
        this.run(
          'INSERT INTO users VALUES(?,?,?,?,?,?)',
          id,
          email,
          null,
          'member',
          1,
          this.now(),
        )
        user = this.user(id)
      }
      // Re-enabling requires a new one-use invitation and new password.
      this.run('UPDATE users SET active=1,password=NULL WHERE id=?', user.id)
      this.run('DELETE FROM sessions WHERE user_id=?', user.id)
      this.run('DELETE FROM invites WHERE user_id=?', user.id)
      const token = secret()
      this.run(
        'INSERT INTO invites VALUES(?,?,?)',
        digest(token),
        user.id,
        this.now() + 48 * 3600_000,
      )
      this.audit(actor, 'member.invite', user.id)
      return token
    })
  }
  async accept(token, email, password) {
    if (!/^[\w-]{43}$/.test(token ?? '') || !validPassword(password))
      return false
    const encoded = await hashPassword(password)
    return this.transaction(() => {
      const invite = this.query(
        'SELECT i.*,u.email,u.active,u.role FROM invites i JOIN users u ON u.id=i.user_id WHERE i.hash=?',
        digest(token),
      )
      if (
        !invite ||
        invite.expires <= this.now() ||
        !invite.active ||
        invite.role !== 'member' ||
        invite.email !== normalizeEmail(email)
      )
        return false
      this.run(
        'UPDATE users SET password=? WHERE id=?',
        encoded,
        invite.user_id,
      )
      this.run('DELETE FROM invites WHERE user_id=?', invite.user_id)
      this.run('DELETE FROM sessions WHERE user_id=?', invite.user_id)
      this.audit(invite.user_id, 'member.activate', invite.user_id)
      return true
    })
  }
  revoke(id, actor) {
    return this.transaction(() => {
      const user = this.user(id)
      if (!user || user.role !== 'member' || id === this.owner()) return false
      this.run('UPDATE users SET active=0 WHERE id=?', id)
      this.run('DELETE FROM sessions WHERE user_id=?', id)
      this.run('DELETE FROM invites WHERE user_id=?', id)
      this.audit(actor, 'member.revoke', id)
      return true
    })
  }
  close() {
    this.db.close()
  }
}
