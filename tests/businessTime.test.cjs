const assert = require('assert/strict')
const fs = require('fs')
const path = require('path')
const ts = require('typescript')

async function loadModule() {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/utils/businessTime.ts'), 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2020, target: ts.ScriptTarget.ES2020 },
  }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`)
}

async function main() {
  const time = await loadModule()
  const boundary = '2026-09-07T16:30:15Z'

  assert.equal(time.businessDateKey(boundary), '2026-09-08')
  assert.equal(time.businessClock(boundary), '00:30')
  assert.equal(time.businessDateKeyAfter(1, boundary), '2026-09-09')
  assert.equal(time.businessDayOffset('2026-09-10', boundary), 2)
  assert.equal(time.shiftBusinessDateKey('2028-02-28', 1), '2028-02-29')
  assert.equal(time.toBusinessDateTime('2026-09-08', '14:30'), '2026-09-08T14:30:00+08:00')
  assert.throws(() => time.toBusinessDateTime('2026-02-30', '14:30'), RangeError)

  console.log(`business time passed (host TZ: ${process.env.TZ || 'system'})`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
