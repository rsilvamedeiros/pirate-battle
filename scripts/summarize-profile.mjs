import fs from 'node:fs/promises'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'

const directory = path.resolve(process.argv[2] ?? '')
if (!process.argv[2]) throw Error('Usage: node scripts/summarize-profile.mjs <artifact-directory>')
const read = async name => JSON.parse(await fs.readFile(path.join(directory, name), 'utf8'))
const zipped = async name => JSON.parse(gunzipSync(await fs.readFile(path.join(directory, name))))
const data = await zipped('frames.json.gz'), environment = await read('environment.json'), outcome = await read('outcome.json')
if (!outcome.complete || data.activeMs !== 180000 || data.pausedFrames || data.truncated) throw Error('Only a complete unpaused three-minute run may produce the reference report')
function statistics(samples) {
  const intervals = samples.map(frame => frame.intervalMs).filter(interval => interval > 0)
  const sum = intervals.reduce((a, b) => a + b, 0)
  const sorted = [...intervals].sort((a, b) => a - b)
  return { samples: intervals.length, meanFps: intervals.length * 1000 / sum,
    p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1], maxMs: sorted.at(-1), intervalWallMs: sum }
}
const windows = Array.from({ length: 6 }, (_, index) => ({ fromSeconds: index * 30, toSeconds: (index + 1) * 30,
  ...statistics(data.frames.filter(frame => frame.activeMs > index * 30000 && frame.activeMs <= (index + 1) * 30000)) }))
const entities = [0, 30, 60, 90, 120, 150, 180].map(seconds => {
  const frame = data.frames.find(frame => frame.activeMs >= seconds * 1000) ?? data.frames.at(-1)
  return { requestedSeconds: seconds, observedActiveMs: frame.activeMs, ...frame.entities }
})
const peaks = Object.fromEntries(Object.keys(data.frames[0].entities).map(key => {
  const frame = data.frames.reduce((peak, candidate) => candidate.entities[key] > peak.entities[key] ? candidate : peak)
  return [key, { count: frame.entities[key], activeMs: frame.activeMs }]
}))
const memory = await read('memory.json')
const heapNames = ['Application', 'Ticker', 'Sprite', 'Graphics', 'HTMLCanvasElement', 'WebGLRenderingContext', 'WebGL2RenderingContext']
for (const record of memory) {
  const snapshot = await zipped(`heap-${record.cycle}.heapsnapshot.gz`)
  const fields = snapshot.snapshot.meta.node_fields, stride = fields.length
  const nameIndex = fields.indexOf('name'), typeIndex = fields.indexOf('type'), sizeIndex = fields.indexOf('self_size')
  const types = snapshot.snapshot.meta.node_types[typeIndex]
  const retained = Object.fromEntries(heapNames.map(name => [name, { count: 0, shallowBytes: 0 }]))
  for (let offset = 0; offset < snapshot.nodes.length; offset += stride) {
    const name = snapshot.strings[snapshot.nodes[offset + nameIndex]]
    if (types[snapshot.nodes[offset + typeIndex]] === 'object' && name in retained) {
      retained[name].count++; retained[name].shallowBytes += snapshot.nodes[offset + sizeIndex]
    }
  }
  record.retainedNamedObjects = retained
  record.heapMiB = record.usage.usedSize / 1048576
  record.deltaMiB = (record.usage.usedSize - memory[0].usage.usedSize) / 1048576
}
const summary = { environment, config: data.config, seed: data.seed, frames: data.frames.length,
  activeMs: data.activeMs, observedWallMs: data.frames.at(-1).wallMs, pausedFrames: data.pausedFrames,
  windows, overall: statistics(data.frames), entities, peaks, memory,
  frameDeltaAboveClampMs: data.frames.reduce((sum, frame) => sum + Math.max(0, frame.intervalMs - 250), 0) }
await fs.writeFile(path.join(directory, 'summary.json'), JSON.stringify(summary, null, 2))
console.log(JSON.stringify({ directory, overall: summary.overall, windows, entities, peaks,
  memory: memory.map(record => ({ cycle: record.cycle, heapMiB: record.heapMiB, deltaMiB: record.deltaMiB,
    dom: record.dom, retained: record.retainedNamedObjects })) }, null, 2))
