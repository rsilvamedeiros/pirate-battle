import { chromium, expect } from '@playwright/test'
import { spawn, execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { gzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'

// A headed, real-time diagnostic run; never use test hooks or accelerate time.
const quick = process.argv.includes('--quick')
const software = process.argv.includes('--software')
const runId = `${new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')}${quick ? '-smoke' : ''}`
const directory = path.resolve('docs/performance/artifacts', runId)
await fs.mkdir(directory, { recursive: true })
const save = (name, data) => fs.writeFile(path.join(directory, name), JSON.stringify(data, null, 2))
const compressed = (name, data) =>
  fs.writeFile(path.join(directory, name), gzipSync(JSON.stringify(data)))
const server = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    '4181',
    '--strictPort',
  ],
  { windowsHide: true, stdio: 'ignore' },
)
let browser
const errors = []
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch('http://127.0.0.1:4181')).ok) break
    } catch {
      /* Wait for this owned preview. */
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  browser = await chromium.launch({
    channel: 'chromium',
    headless: false,
    args: software ? ['--use-angle=swiftshader'] : [],
  })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    locale: 'en-US',
    timezoneId: 'UTC',
  })
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  const cdp = await context.newCDPSession(page)
  const browserCdp = await browser.newBrowserCDPSession()
  const system = await browserCdp.send('SystemInfo.getInfo')
  const buildFiles = await fs.readdir('dist/assets')
  const entry = buildFiles.find((name) => /^index-.*\.js$/.test(name))
  const buildHash = createHash('sha256')
    .update(await fs.readFile(`dist/assets/${entry}`))
    .digest('hex')
  let hardware = null
  if (process.platform === 'win32') {
    hardware = JSON.parse(
      execFileSync(
        'powershell.exe',
        [
          '-NoProfile',
          '-Command',
          '@{cpu=(Get-CimInstance Win32_Processor | Select-Object Name,NumberOfCores,NumberOfLogicalProcessors); system=(Get-CimInstance Win32_ComputerSystem | Select-Object Manufacturer,Model,TotalPhysicalMemory); video=(Get-CimInstance Win32_VideoController | Select-Object Name,DriverVersion,CurrentHorizontalResolution,CurrentVerticalResolution,CurrentRefreshRate)} | ConvertTo-Json -Depth 5',
        ],
        { encoding: 'utf8', windowsHide: true },
      ),
    )
  }
  await save('environment.json', {
    runId,
    quick,
    software,
    browser: browser.version(),
    node: process.version,
    os: {
      platform: process.platform,
      release: os.release(),
      architecture: process.arch,
      ramBytes: os.totalmem(),
    },
    hardware,
    gpu: system.gpu,
    viewport: { width: 1280, height: 720 },
    devicePixelRatio: 1,
    headless: false,
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    changes: execFileSync('git', ['status', '--short'], { encoding: 'utf8' }),
    entry,
    buildHash,
    controls: 'Hold W, D, Space, Q and E during each gameplay window',
    url: 'http://127.0.0.1:4181/?profile=1&preset=endurance&seed=42&scenario=success',
  })
  await page.goto('http://127.0.0.1:4181/?profile=1&preset=endurance&seed=42&scenario=success')
  async function start() {
    await page.bringToFront()
    await page.getByRole('button', { name: 'Play', exact: true }).click()
    await expect
      .poll(() => page.evaluate(() => Boolean(window.__profiling)), { timeout: 20000 })
      .toBe(true)
    if (await page.getByRole('button', { name: 'Resume', exact: true }).count())
      await page.getByRole('button', { name: 'Resume', exact: true }).click()
    for (const key of ['w', 'd', 'Space', 'q', 'e']) await page.keyboard.down(key)
  }
  async function exit() {
    for (const key of ['w', 'd', 'Space', 'q', 'e']) await page.keyboard.up(key)
    const pause = page.getByRole('button', { name: 'Pause', exact: true })
    if (await pause.isEnabled()) await pause.click()
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
    await expect(page.locator('canvas')).toHaveCount(0)
    expect(
      await page.evaluate(() => [Boolean(window.__game), Boolean(window.__profiling)]),
    ).toEqual([false, false])
  }
  const traceEvents = []
  cdp.on('Tracing.dataCollected', (event) => traceEvents.push(...event.value))
  let traceStarted = false,
    traceComplete
  async function play(activeSeconds, label, trace = false) {
    const wallStart = Date.now()
    let previousProgress = -1
    for (;;) {
      const status = await page.evaluate(() => window.__profiling.status())
      if (status.status === 'paused')
        throw Error(`${label} paused: keep the browser visible and focused`)
      const progress = Math.floor(status.activeMs / 10000)
      if (progress !== previousProgress) {
        console.log(
          `${label}: ${(status.activeMs / 1000).toFixed(1)} active seconds, ${status.entities.total} entities`,
        )
        previousProgress = progress
      }
      if (trace && !traceStarted && status.activeMs >= 150000) {
        traceComplete = new Promise((resolve) => cdp.once('Tracing.tracingComplete', resolve))
        await cdp.send('Tracing.start', {
          categories: 'devtools.timeline,v8,disabled-by-default-v8.cpu_profiler',
          transferMode: 'ReportEvents',
        })
        traceStarted = true
        await page.screenshot({ path: path.join(directory, 'dense-combat.png') })
      }
      if (status.activeMs >= activeSeconds * 1000 || status.status === 'completed')
        return { ...status, elapsedWallMs: Date.now() - wallStart }
      if (Date.now() - wallStart > (activeSeconds + 120) * 1000)
        throw Error(`${label} exceeded its real-time deadline`)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
  console.log(`Evidence directory: ${directory}`)
  await start()
  await play(quick ? 2 : 10, 'Warm-up')
  await exit()
  await start()
  const result = await play(quick ? 5 : 180, 'Main match', !quick)
  if (!quick && (result.status !== 'completed' || result.endReason !== 'time-expired'))
    throw Error('Main match is incomplete: no three-minute performance conclusion is valid')
  const frames = await page.evaluate(() => window.__profiling.export())
  await compressed('frames.json.gz', frames)
  await save('match-summary.json', result)
  await page.screenshot({ path: path.join(directory, 'match-end.png') })
  if (traceStarted) {
    await cdp.send('Tracing.end')
    await traceComplete
    await compressed('performance-trace.json.gz', { traceEvents })
  }
  await exit()
  await cdp.send('HeapProfiler.enable')
  const memory = []
  async function heap(cycle, status = null) {
    await new Promise((resolve) => setTimeout(resolve, 5000))
    await cdp.send('HeapProfiler.collectGarbage')
    const usage = await cdp.send('Runtime.getHeapUsage')
    const dom = await cdp.send('Memory.getDOMCounters')
    const chunks = []
    const collect = (event) => chunks.push(event.chunk)
    cdp.on('HeapProfiler.addHeapSnapshotChunk', collect)
    await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false })
    cdp.off('HeapProfiler.addHeapSnapshotChunk', collect)
    await fs.writeFile(
      path.join(directory, `heap-${cycle}.heapsnapshot.gz`),
      gzipSync(chunks.join('')),
    )
    const entry = {
      cycle,
      status,
      usage,
      dom,
      hooks: await page.evaluate(() => ({
        game: Boolean(window.__game),
        profiler: Boolean(window.__profiling),
        canvases: document.querySelectorAll('canvas').length,
      })),
    }
    memory.push(entry)
    await save('memory.json', memory)
    console.log(
      `Heap ${cycle}: ${(usage.usedSize / 1048576).toFixed(3)} MiB, ${dom.jsEventListeners} DOM listeners`,
    )
  }
  await heap(0)
  for (let cycle = 1; cycle <= (quick ? 1 : 5); cycle++) {
    await start()
    const status = await play(quick ? 2 : 60, `Memory cycle ${cycle}`)
    await exit()
    await heap(cycle, status)
  }
  expect(errors).toEqual([])
  await save('outcome.json', {
    complete: !quick,
    smokeOnly: quick,
    errors,
    result,
    cycles: memory.length - 1,
  })
  console.log('Profiling finished; review raw evidence before drawing conclusions.')
} catch (error) {
  await save('failure.json', { message: String(error), errors })
  throw error
} finally {
  await browser?.close()
  server.kill()
}
