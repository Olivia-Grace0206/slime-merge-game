import { commitStorage, decodeSession, SAVE_KEY, type StoragePort } from '../core/progression/persistence'
import { freshSession, reduceSession, type Command, type Session } from '../core/progression/session'

export type StoreState = Readonly<{ session: Session; error: string | null }>
/** Single transaction queue plus an origin-wide lock. A failed write never publishes game rewards. */
export class SessionStore {
  private raw: string | null = null
  private tail: Promise<unknown> = Promise.resolve()
  state: StoreState
  constructor(private storage: StoragePort, now: number) {
    let session = freshSession(now), error: string | null = null
    try {
      this.raw = storage.getItem(SAVE_KEY)
      if (this.raw !== null) {
        const load = decodeSession(this.raw, now)
        if (load.ok) session = load.session
        else error = load.reason
      }
    } catch { error = '保存領域を読み込めません。保存を許可して再読み込みしてください' }
    this.state = { session, error }
  }
  dispatch(command: Command, now: number, random = Math.random): Promise<StoreState> {
    const work = async () => {
      if (this.state.error) return this.state
      if (!navigator.locks) {
        this.state = { ...this.state, error: 'このブラウザでは安全な保存ロックを利用できません。最新版またはlocalhostで開いてください' }
        return this.state
      }
      return navigator.locks.request(SAVE_KEY, () => {
        // Clock is captured per input; queued earlier input must not roll the clock backwards.
        const time = Math.max(now, Date.now())
        const next = reduceSession(this.state.session, command, time, random)
        if (next === this.state.session) return this.state
        const saved = commitStorage(this.storage, this.raw, next)
        if (saved.ok) { this.raw = saved.raw; this.state = { session: next, error: null } }
        else this.state = { ...this.state, error: saved.reason }
        return this.state
      })
    }
    const promise = this.tail.then(work)
    this.tail = promise.catch(() => {})
    return promise
  }
  retry(): StoreState {
    // Never clear a corrupt or externally changed file. Only retry a transient write failure.
    try {
      if (this.storage.getItem(SAVE_KEY) === this.raw && (this.raw === null || decodeSession(this.raw, Date.now()).ok)) this.state = { ...this.state, error: null }
    } catch { /* retain failure */ }
    return this.state
  }
}
