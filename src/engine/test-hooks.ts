import type { SimulationState } from '../core/simulation'

export interface GameHooks {
  getState(): SimulationState
  advance(milliseconds: number): void
}

declare global { interface Window { __game?: GameHooks } }
