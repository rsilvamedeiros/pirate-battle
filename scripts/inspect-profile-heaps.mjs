import fs from 'node:fs/promises'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'

const directory = path.resolve(process.argv[2] ?? '')
if (!process.argv[2]) throw Error('Usage: node scripts/inspect-profile-heaps.mjs <artifact-directory>')
const signatures = {
  gameEngine: ['getState', 'getSnapshot', 'press', 'release', 'pause', 'resume', 'clearActions', 'frame', 'subscribe'],
  renderProfiler: ['frame', 'status', 'export'],
  gameRuntime: ['manual', 'engine', 'profiler', 'addTime'],
  simulationState: ['enemies', 'projectiles', 'effects', 'ticks', 'elapsedMs', 'player', 'randomState'],
  pixiApplication: ['stage', 'renderer', '_ticker'],
}
const results = []
for (let cycle = 0; cycle <= 5; cycle++) {
  const heap = JSON.parse(gunzipSync(await fs.readFile(path.join(directory, `heap-${cycle}.heapsnapshot.gz`))))
  const meta = heap.snapshot.meta, nf = meta.node_fields, ef = meta.edge_fields
  const ns = nf.length, es = ef.length, ntype = nf.indexOf('type'), nname = nf.indexOf('name'), nsize = nf.indexOf('self_size')
  const nedge = nf.indexOf('edge_count'), etype = ef.indexOf('type'), ename = ef.indexOf('name_or_index'), eto = ef.indexOf('to_node')
  const nodeTypes = meta.node_types[ntype], edgeTypes = meta.edge_types[etype]
  const counts = Object.fromEntries(Object.keys(signatures).map(name => [name, 0]))
  const bytes = {}, parent = new Int32Array(heap.edges.length / es), targets = [], targetProperties = new Map()
  let edgeOffset = 0
  for (let node = 0; node < heap.nodes.length; node += ns) {
    const type = nodeTypes[heap.nodes[node + ntype]], name = heap.strings[heap.nodes[node + nname]]
    bytes[`${type}:${name}`] = (bytes[`${type}:${name}`] ?? 0) + heap.nodes[node + nsize]
    if (type === 'object' && ['HTMLCanvasElement', 'WebGLRenderingContext', 'WebGL2RenderingContext'].includes(name)) targets.push(node)
    const keys = new Set()
    const until = edgeOffset + heap.nodes[node + nedge] * es
    for (; edgeOffset < until; edgeOffset += es) {
      parent[edgeOffset / es] = node
      if (edgeTypes[heap.edges[edgeOffset + etype]] === 'property') keys.add(heap.strings[heap.edges[edgeOffset + ename]])
    }
    if (type === 'object') for (const [label, properties] of Object.entries(signatures)) if (properties.every(key => keys.has(key))) counts[label]++
    if (targets.at(-1) === node) targetProperties.set(node, [...keys].slice(0, 20))
  }
  const describe = node => ({ type: nodeTypes[heap.nodes[node + ntype]], name: heap.strings[heap.nodes[node + nname]], id: heap.nodes[node + nf.indexOf('id')] })
  function retainingPath(target) {
    let frontier = new Map([[target, [describe(target)]]])
    const visited = new Set([target])
    for (let depth = 0; depth < 12; depth++) {
      const next = new Map()
      for (let edge = 0; edge < heap.edges.length; edge += es) {
        const to = heap.edges[edge + eto]
        if (!frontier.has(to) || edgeTypes[heap.edges[edge + etype]] === 'weak') continue
        const from = parent[edge / es]
        if (visited.has(from)) continue
        visited.add(from)
        const type = edgeTypes[heap.edges[edge + etype]], index = heap.edges[edge + ename]
        const label = type === 'element' || type === 'hidden' ? String(index) : heap.strings[index]
        const chain = [{ ...describe(from), edgeToNext: `${type}:${label}` }, ...frontier.get(to)]
        if (from === 0 || describe(from).name === '(GC roots)') return chain
        next.set(from, chain)
      }
      frontier = next
      if (!frontier.size) break
    }
    return [{ ...describe(target), note: 'No strong root path found within twelve edges; not proof of collection.' }]
  }
  results.push({ cycle, shapeCounts: counts, bytes, retainedBrowserObjectPaths: targets.map(retainingPath),
    retainedBrowserObjectProperties: targets.map(node => ({ ...describe(node), sampleProperties: targetProperties.get(node) })) })
}
const baseline = results[0].bytes
const final = results.at(-1).bytes
const changes = Object.keys(final).map(name => ({ name, baselineBytes: baseline[name] ?? 0, finalBytes: final[name], deltaBytes: final[name] - (baseline[name] ?? 0) }))
  .sort((a, b) => b.deltaBytes - a.deltaBytes).slice(0, 20)
const report = { signatures, cycles: results.map(({ bytes: _bytes, ...rest }) => rest), largestShallowByteIncreases: changes,
  caveat: 'Property signatures survive minification but are heuristic instance identification. Shortest strong paths and shallow bytes are not dominator retained sizes or a proof of leak freedom.' }
await fs.writeFile(path.join(directory, 'heap-investigation.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify({ cycles: report.cycles.map(({ cycle, shapeCounts }) => ({ cycle, shapeCounts })),
  largestShallowByteIncreases: changes.slice(0, 8).map(item => ({ ...item, name: item.name.slice(0, 100) })) }, null, 2))
