import { afterEach, expect, it, vi } from 'vitest'
import { createDataRuntime } from './runtime'
import { createResultsStore } from '../persistence/results'
import { defaultGameplayConfig } from '../core/config'

const worker = vi.hoisted(() => ({ start: vi.fn(async () => {}), stop: vi.fn() }))
vi.mock('msw/browser', () => ({ setupWorker: () => worker }))
afterEach(() => {
  vi.unstubAllGlobals()
  worker.start.mockClear()
})

function setup() {
  vi.stubGlobal('location', { search: '', href: 'http://pirate.test/' })
  vi.stubGlobal('history', { replaceState: vi.fn() })
  const active = {
    state: 'activated',
    scriptURL: 'http://pirate.test/pirate-battle-worker.js',
    postMessage: vi.fn(),
  }
  vi.stubGlobal('navigator', {
    serviceWorker: {
      register: vi.fn(async () => ({ active })),
      controller: active,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  })
  const data = new Map<string, string>()
  const storage = {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
  }
  const identity = {
    version: 1 as const,
    playerId: 'local',
    playerName: 'Player',
    sessionTime: defaultGameplayConfig.sessionTime,
    enemySpawnInterval: defaultGameplayConfig.enemySpawnInterval,
  }
  const store = createResultsStore(
    storage,
    identity,
    () => 'match',
    () => '2026-10-02T00:00:00.000Z',
  )
  const runtime = createDataRuntime(store, storage, identity)
  return { storage, runtime }
}
it('initializes one worker for concurrent calls and reaches ready', async () => {
  const { runtime } = setup()
  await Promise.all([runtime.start(), runtime.start()])
  expect(worker.start).toHaveBeenCalledTimes(1)
  expect(runtime.getSnapshot().status).toBe('ready')
  runtime.submissions.dispose()
  runtime.client.clear()
})
it('can retry a synchronous startup read failure after storage recovers', async () => {
  const { storage, runtime } = setup()
  storage.getItem.mockImplementationOnce(() => {
    throw new Error('Storage blocked')
  })
  await runtime.start()
  expect(runtime.getSnapshot()).toMatchObject({ status: 'error', error: 'Storage blocked' })
  await runtime.start()
  expect(runtime.getSnapshot().status).toBe('ready')
  expect(worker.start).toHaveBeenCalledTimes(1)
  runtime.submissions.dispose()
  runtime.client.clear()
})
