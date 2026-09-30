const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm')
const ts = require('typescript'), vue = require('vue')
const source = fs.readFileSync(path.resolve(__dirname, '../src/composables/useWechatBinding.ts'), 'utf8')
function platformSource(platform) {
  const stack = [true]
  return source.split('\n').filter(line => {
    const start = line.match(/\/\/ #ifdef (.+)/)
    if (start) { stack.push(stack.at(-1) && start[1].trim() === platform); return false }
    if (/\/\/ #endif/.test(line)) { stack.pop(); return false }
    return stack.at(-1)
  }).join('\n')
}
function setup(platform = 'H5', overrides = {}) {
  const calls = { starts: 0, completes: [], mobile: [], restored: [], toasts: [], redirects: [], cleaned: [], modals: [] }
  const storage = new Map(), options = { userId: () => 'current-account', getDraft: () => ({ nickname: '未保存昵称', gender: 'unspecified', birthDate: '' }), restoreDraft: draft => calls.restored.push(draft), hasTemporaryAvatar: () => false }
  let serverStatus = { bound: false, channels: [] }
  const services = {
    getWechatBindingStatus: async () => ({ data: serverStatus }),
    startWechatH5Binding: async () => { calls.starts++; return { data: { state: 'bind_expected', authorize_url: 'https://open.weixin.qq.com/connect/oauth2/authorize?state=bind_expected' } } },
    completeWechatH5Binding: async ticket => { calls.completes.push(ticket); serverStatus = { bound: true, channels: ['official_account'] }; return { data: serverStatus } },
    bindWechatMobile: async code => { calls.mobile.push(code); serverStatus = { bound: true, channels: ['mobile_app'] }; return { data: serverStatus } },
    ...overrides.services,
  }
  const exportsObject = {}, page = { options: { wechatBindTicket: 'callback-ticket', wechatBindState: 'bind_expected' } }
  const context = { exports: exportsObject, Error, Date, URL, URLSearchParams, getCurrentPages: () => [page], require(name) {
    if (name === 'vue') return { ...vue, onBeforeUnmount() {} }
    if (name === '@/services/wechatBinding') return services
    if (name === '@/services/wechatPay') return { isWechatBrowser: () => overrides.available !== false }
    return {}
  }, window: {
    sessionStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    location: { href: 'https://h5.example.invalid/#/pages/profile/edit?wechatBindTicket=callback-ticket&wechatBindState=bind_expected', assign: url => calls.redirects.push(url) },
    history: { state: {}, replaceState: (_state, _title, url) => calls.cleaned.push(url) },
  }, uni: {
    showToast: options => calls.toasts.push(options), showModal: options => { calls.modals.push(options); options.success({ confirm: overrides.confirmed !== false }) },
    getProvider: options => options.success({ provider: ['weixin'] }), login: options => options.success({ code: 'sdk-code' }),
  } }
  vm.runInNewContext(ts.transpileModule(platformSource(platform), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context)
  return { binding: exportsObject.useWechatBinding(options), calls, storage, page, setStatus: value => { serverStatus = value } }
}
;(async () => {
  const h5 = setup()
  await h5.binding.initialize()
  assert.equal(h5.binding.statusLabel.value, '未绑定')
  await h5.binding.bind()
  assert.equal(h5.calls.starts, 1)
  assert.equal(h5.calls.completes.length, 0, 'authorization start is not successful linking')
  assert.equal(h5.binding.currentBound.value, false)
  assert.equal(h5.calls.redirects.length, 1)
  await h5.binding.initialize(h5.page.options)
  assert.deepEqual(h5.calls.completes, ['callback-ticket'])
  assert.equal(h5.binding.statusLabel.value, '已绑定')
  assert.equal(h5.calls.restored[0].nickname, '未保存昵称')
  assert.ok(!h5.calls.cleaned[0].includes('wechatBindTicket'))
  assert.equal(h5.page.options.wechatBindTicket, undefined)
  assert.equal(h5.page.options.wechatBindState, undefined)
  await h5.binding.bind()
  assert.equal(h5.calls.starts, 1, 'bound rows cannot replace an existing WeChat identity')

  const cancelled = setup()
  await cancelled.binding.initialize(); await cancelled.binding.bind()
  await cancelled.binding.initialize({ wechatBindError: 'cancelled', wechatBindState: 'bind_expected' })
  assert.equal(cancelled.calls.completes.length, 0)
  assert.equal(cancelled.binding.currentBound.value, false)
  assert.equal(cancelled.calls.restored.length, 1)
  assert.equal(cancelled.storage.size, 0)
  for (const mutation of [pending => { pending.state = 'wrong-state' }, pending => { pending.userId = 'other-account' }, pending => { pending.createdAt -= 11 * 60 * 1000 }]) {
    const invalid = setup()
    await invalid.binding.initialize(); await invalid.binding.bind()
    const key = [...invalid.storage.keys()][0], pending = JSON.parse(invalid.storage.get(key))
    mutation(pending); invalid.storage.set(key, JSON.stringify(pending))
    await invalid.binding.initialize({ wechatBindTicket: 'callback-ticket', wechatBindState: 'bind_expected' })
    assert.equal(invalid.calls.completes.length, 0)
    assert.equal(invalid.calls.restored.length, 0)
  }
  const outside = setup('H5', { available: false })
  await outside.binding.initialize(); await outside.binding.bind()
  assert.equal(outside.calls.starts, 0)
  assert.ok(outside.calls.toasts.at(-1).title.includes('微信内'))
  const denied = setup('H5', { confirmed: false })
  await denied.binding.initialize(); await denied.binding.bind()
  assert.equal(denied.calls.starts, 0)
  const failed = setup('H5', { services: { getWechatBindingStatus: async () => { throw new Error('offline') } } })
  await failed.binding.initialize()
  assert.equal(failed.binding.statusLabel.value, '状态加载失败', 'network errors are not unbound state')
  await failed.binding.bind()
  assert.equal(failed.calls.starts, 0)
  const forged = setup('H5', { services: { startWechatH5Binding: async () => ({ data: { state: 'bind_expected', authorize_url: 'https://attacker.invalid/?state=bind_expected' } }) } })
  await forged.binding.initialize(); await forged.binding.bind()
  assert.equal(forged.calls.redirects.length, 0)
  const mobile = setup('APP-PLUS')
  await mobile.binding.initialize(); await mobile.binding.bind()
  assert.deepEqual(mobile.calls.mobile, ['sdk-code'])
  assert.equal(mobile.binding.statusLabel.value, '已绑定')
  const services = fs.readFileSync(path.resolve(__dirname, '../src/services/wechatBinding.ts'), 'utf8')
  assert.ok(!services.includes('saveSession') && !services.includes('skipAuth') && !services.includes('/auth/login/'), 'linking never uses unauthenticated login/account creation')
  console.log('PASS H5/App binding: authenticated linking, confirmation, draft restore, state/account/expiry guards, URL cleanup and honest failure states')
})().catch(error => { console.error(error); process.exitCode = 1 })
