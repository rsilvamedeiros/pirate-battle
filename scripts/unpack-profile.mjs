import fs from 'node:fs/promises'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'

if (!process.argv[2])
  throw Error('Usage: node scripts/unpack-profile.mjs <artifact-directory> [output-directory]')
const source = path.resolve(process.argv[2])
const target = path.resolve(process.argv[3] ?? 'test-results/profile-evidence')
await fs.mkdir(target, { recursive: true })
for (const name of await fs.readdir(source))
  if (name.endsWith('.gz')) {
    await fs.writeFile(
      path.join(target, name.slice(0, -3)),
      gunzipSync(await fs.readFile(path.join(source, name))),
    )
  }
console.log(
  `Decompressed evidence: ${target}. Load the trace in DevTools Performance and .heapsnapshot files in Memory.`,
)
