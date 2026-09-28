const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

// Exercise the real HTTP error and recovery code without a server or WeChat SDK.
function mount() {
  const calls = { requests: 0, modals: [], toasts: [] }
  const uni = {
    request(options) {
      calls.requests += 1
      options.success({ statusCode: 409, data: {
        code: 'huifu_payment_pending_confirmation', detail: '原支付结果尚未确认',
      } })
    },
    showModal: options => calls.modals.push(options),
    showToast: options => calls.toasts.push(options),
  }
  function load(relativePath, imports) {
    const filename = path.resolve(__dirname, relativePath)
    const source = fs.readFileSync(filename, 'utf8').replace(/import\.meta\.env/g, '({})')
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText
    const context = { exports: {}, require: name => imports[name], uni, Error }
    vm.runInNewContext(output, context, { filename })
    return context.exports
  }
  const http = load('../src/services/http.ts', { './session': { getAccessToken: () => '' } })
  const payment = load('../src/services/wechatPay.ts', { './http': http })
  return { ...http, ...payment, calls }
}

async function apiErrorPreservesCodeAndHumanMessageWithoutRetryingPost() {
  const { request, ApiError, calls } = mount()
  await assert.rejects(request('/payment-session/', { method: 'POST' }), error => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.code, 'huifu_payment_pending_confirmation')
    assert.equal(error.message, '原支付结果尚未确认')
    return true
  })
  assert.equal(calls.requests, 1)
}

async function recoveredSuccessRefreshesServerState() {
  const { ApiError, handlePaymentRecovery, calls } = mount()
  let refreshed = 0
  const handled = await handlePaymentRecovery(
    new ApiError({ code: 'huifu_payment_status_updated', detail: '结果已确认' }, ''),
    async () => { refreshed += 1 },
  )
  assert.equal(handled, true)
  assert.equal(refreshed, 1)
  assert.equal(calls.requests, 0)
  assert.equal(calls.modals.length, 0)
}

async function uncertainOrClosedPaymentNeverPretendsSuccess() {
  for (const code of ['huifu_payment_pending_confirmation', 'huifu_payment_closed']) {
    const { ApiError, handlePaymentRecovery, calls } = mount()
    let refreshed = 0
    assert.equal(await handlePaymentRecovery(
      new ApiError({ code, detail: '请核对原支付' }, ''), async () => { refreshed += 1 },
    ), true)
    assert.equal(refreshed, 0)
    assert.equal(calls.modals.length, 1)
    assert.equal(calls.modals[0].content, '请核对原支付')
    assert.equal(calls.modals[0].showCancel, false)
    assert.equal(calls.requests, 0)
  }
}

async function failedRefreshIsReportedWithoutClaimingSuccess() {
  const { ApiError, handlePaymentRecovery, calls } = mount()
  assert.equal(await handlePaymentRecovery(
    new ApiError({ code: 'huifu_payment_status_updated', detail: '结果已确认' }, ''),
    async () => { throw new Error('查询失败') },
  ), true)
  assert.equal(calls.toasts[0].title, '查询失败')
  assert.equal(calls.toasts[0].icon, 'none')
}

async function unrelatedErrorsStillUseNormalErrorHandling() {
  const { ApiError, handlePaymentRecovery, calls } = mount()
  for (const error of [new Error('网络错误'), new ApiError({ detail: '配置错误' }, '')]) {
    assert.equal(await handlePaymentRecovery(error, async () => assert.fail('unexpected refresh')), false)
  }
  assert.equal(calls.modals.length, 0)
  assert.equal(calls.toasts.length, 0)
}

async function main() {
  for (const test of [
    apiErrorPreservesCodeAndHumanMessageWithoutRetryingPost,
    recoveredSuccessRefreshesServerState,
    uncertainOrClosedPaymentNeverPretendsSuccess,
    failedRefreshIsReportedWithoutClaimingSuccess,
    unrelatedErrorsStillUseNormalErrorHandling,
  ]) {
    await test()
    console.log(`PASS ${test.name}`)
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
