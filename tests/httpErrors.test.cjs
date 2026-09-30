const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const filename = path.resolve(__dirname, '../src/services/http.ts')
const source = fs.readFileSync(filename, 'utf8').replace(/import\.meta\.env/g, '({})')
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText

async function errorFor(body) {
  const calls = []
  const context = {
    exports: {}, Error,
    require: name => name === './session' ? { getAccessToken: () => '' } : {},
    uni: { request: options => { calls.push(options); options.success({ statusCode: 400, data: body }) } },
  }
  vm.runInNewContext(output, context, { filename })
  let caught
  try { await context.exports.request('/auth/register/', { method: 'POST', skipAuth: true }) }
  catch (error) { caught = error }
  assert.ok(caught instanceof context.exports.ApiError)
  assert.equal(calls.length, 1, 'validation errors must not retry registration')
  return caught
}

;(async () => {
  assert.equal((await errorFor({ code: '验证码错误或已过期。' })).message, '验证码错误或已过期。')
  assert.equal((await errorFor(JSON.stringify({ code: '验证码错误或已过期。' }))).message, '验证码错误或已过期。')
  assert.equal((await errorFor({ code: 'huifu_payment_closed' })).message, '请求失败（400）')
  assert.equal((await errorFor({ code: 'huifu_payment_closed', detail: '订单已关闭' })).message, '订单已关闭')
  assert.equal((await errorFor({ code: 'technical_error', phone: ['手机号无效。'] })).message, '手机号无效。')
  assert.equal((await errorFor({ errors: { code: ['验证码不正确。'] } })).message, '验证码不正确。')
  assert.equal((await errorFor('<html>error</html>')).message, '请求失败（400）')
  console.log('PASS HTTP 400: human-readable code/field/detail messages, machine-code fallback and JSON text bodies')
})().catch(error => { console.error(error); process.exitCode = 1 })
