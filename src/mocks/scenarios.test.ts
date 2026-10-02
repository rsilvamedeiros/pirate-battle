import { expect, it } from 'vitest'
import { createScenarioManager, scenarioDefinitions } from './scenarios'
import type { ScenarioId } from './scenarios'

it('defines all fourteen required network scenarios and falls back visibly', () => {
  expect(Object.keys(scenarioDefinitions)).toHaveLength(14)
  const manager = createScenarioManager(new URLSearchParams('scenario=unknown&seed=bad'))
  expect(manager.getSnapshot()).toMatchObject({ id: 'success', notice: 'Unknown network scenario. Using success.' })
})
it('keeps seeded endpoint latency streams independent and resets their counters', () => {
  const first = createScenarioManager(new URLSearchParams('scenario=variable-latency&seed=42'))
  const second = createScenarioManager(new URLSearchParams('scenario=variable-latency&seed=42'))
  const expected = Array.from({ length: 4 }, () => first.schedule('ranking').milliseconds)
  const actual = Array.from({ length: 4 }, () => { second.schedule('history'); return second.schedule('ranking').milliseconds })
  expect(actual).toEqual(expected)
  expect(expected.every((latency) => latency >= 100 && latency <= 1500)).toBe(true)
  second.select('variable-latency')
  expect(second.schedule('ranking').milliseconds).toBe(expected[0])
})
it('controls endpoint-specific failures and alternating out-of-order reads', () => {
  const manager = createScenarioManager(new URLSearchParams('scenario=out-of-order'))
  expect([manager.schedule('ranking').milliseconds, manager.schedule('ranking').milliseconds]).toEqual([2000, 100])
  manager.select('ranking-failure')
  expect(manager.schedule('ranking').status).toBe(500)
  expect(manager.schedule('history').status).toBeNull()
  manager.select('offline-at-match-end')
  expect(manager.schedule('submission').networkFailure).toBe(true)
  expect(manager.schedule('ranking').networkFailure).toBe(false)
})
it('invalidates prior schedules on every scenario switch, including reset', () => {
  const manager = createScenarioManager(new URLSearchParams())
  let revision = 0
  for (const id of Object.keys(scenarioDefinitions) as ScenarioId[]) {
    manager.select(id)
    expect(manager.getSnapshot().revision).toBe(++revision)
  }
})
