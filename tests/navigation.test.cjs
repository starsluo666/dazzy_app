const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const source = fs.readFileSync(path.join(__dirname, '../src/utils/navigation.ts'), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
function mount(pageCount, fails = false) {
  const calls = { back: 0, fallback: 0 }
  const exports = {}
  vm.runInNewContext(code, {
    exports,
    getCurrentPages: () => Array.from({ length: pageCount }, () => ({})),
    uni: { navigateBack(options) { calls.back++; assert.equal(options.delta, 1); if (fails) options.fail() } },
  })
  exports.navigateBackOr(() => calls.fallback++)
  return calls
}
assert.deepEqual(mount(0), { back: 0, fallback: 1 })
assert.deepEqual(mount(1), { back: 0, fallback: 1 })
assert.deepEqual(mount(2), { back: 1, fallback: 0 })
assert.deepEqual(mount(3, true), { back: 1, fallback: 1 })
console.log('PASS: back stack, direct-entry fallback and failed navigation')
