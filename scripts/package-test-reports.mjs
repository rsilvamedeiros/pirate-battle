import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'

// Reuse the ZIP writer bundled with the lockfile's Playwright installation.
const require = createRequire(import.meta.url)
const { yazl } = require(path.join(path.dirname(require.resolve('playwright-core/package.json')), 'lib/utilsBundle.js'))

const [reportArgument, outputArgument, ...extraArguments] = process.argv.slice(2)
if (!reportArgument || !outputArgument) {
  throw Error('Usage: node scripts/package-test-reports.mjs <html-report-directory> <new-evidence-directory> [extra-files...]')
}
const report = path.resolve(reportArgument)
const output = path.resolve(outputArgument)
await fs.access(path.join(report, 'index.html'))
// Never silently replace an earlier verification run.
await fs.mkdir(output, { recursive: false })
const archive = new yazl.ZipFile()
async function add(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) await add(target)
    else archive.addFile(target, path.relative(report, target).split(path.sep).join('/'))
  }
}
await add(report)
const completion = pipeline(archive.outputStream, createWriteStream(path.join(output, 'html-report.zip')))
archive.end()
await completion
for (const argument of extraArguments) {
  const source = path.resolve(argument)
  await fs.copyFile(source, path.join(output, path.basename(source)))
}
const hashes = {}
async function inspect(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) await inspect(target)
    else {
      const bytes = await fs.readFile(target)
      hashes[path.relative(output, target).split(path.sep).join('/')] = {
        bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
      }
    }
  }
}
await inspect(output)
await fs.writeFile(path.join(output, 'checksums.json'), `${JSON.stringify(hashes, null, 2)}\n`)
console.log(`Packaged ${Object.keys(hashes).length} files at ${output}; extract html-report.zip and serve index.html to open the report.`)
