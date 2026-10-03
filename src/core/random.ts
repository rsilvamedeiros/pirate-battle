/** Pure xorshift32 transition. Zero seeds map to a documented nonzero seed. */
export function normalizeSeed(seed: number): number {
  return seed >>> 0 || 1
}
export function nextRandom(seed: number): { state: number; value: number } {
  let state = normalizeSeed(seed)
  state ^= state << 13
  state ^= state >>> 17
  state ^= state << 5
  state >>>= 0
  return { state, value: state / 4294967296 }
}
