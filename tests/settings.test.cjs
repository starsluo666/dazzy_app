const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const vue = require('vue')

function mount(relative, names, auth = {}) {
  const source = fs.readFileSync(path.resolve(__dirname, '../src', relative), 'utf8')
  const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1].replaceAll('import.meta.env.DEV', 'true')
  const calls = { modals: [], toasts: [], navigation: [], timers: [], intervals: [], hooks: {}, exposed: {} }
  const lifecycle = name => callback => { calls.hooks[name] = callback }
  const code = ts.transpileModule(script + `\nglobalThis.subject = { ${names.join(',')} };`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const context = {
    exports: {},
    Error,
    require(name) {
      if (name === 'vue') return { ...vue, onBeforeUnmount: lifecycle('unmount') }
      if (name === '@dcloudio/uni-app') return { onLoad: lifecycle('load'), onShow: lifecycle('show'), onHide: lifecycle('hide') }
      if (name === '@/services/auth') return auth
      if (name === '@/services/session') return { guardCurrentPage: () => true, isAuthenticated: () => true, clearSession: () => calls.navigation.push({ clearSession: true }) }
      if (name === '@/utils/formatters') return { formatBusinessDateTime: value => value }
      if (name === '@/content/legal') return {
        legalDocumentUrl: kind => `/pages/legal/document?type=${kind}`,
        openLegalDocument: kind => calls.navigation.push({ url: `/pages/legal/document?type=${kind}` }),
      }
      return {}
    },
    uni: {
      showModal: options => calls.modals.push(options),
      showToast: options => calls.toasts.push(options),
      navigateTo: options => calls.navigation.push(options),
      redirectTo: options => calls.navigation.push(options),
      reLaunch: options => calls.navigation.push(options),
    },
    defineExpose: api => { calls.exposed = api },
    setTimeout: callback => { calls.timers.push(callback); return calls.timers.length },
    setInterval: callback => { calls.intervals.push(callback); return calls.intervals.length },
    clearInterval() {},
  }
  vm.runInNewContext(code, context)
  return { subject: context.subject, calls }
}
const security = password_set => ({ password_set, phone_masked: '151****0000' })
const tick = async () => { await Promise.resolve(); await Promise.resolve() }
function sheet(auth = {}) {
  return mount('components/AccountActionSheet.vue', [
    'open', 'panel', 'security', 'loading', 'error', 'saving', 'closePanel', 'loadSecurity',
    'currentPassword', 'newPassword', 'confirmation', 'initialCode', 'submit', 'sendInitialCode', 'codeSeconds',
    'closureAgreed', 'readClosureAgreement', 'resume',
  ], { getAccountSecurity: async () => ({ data: security(true) }), ...auth })
}
function respond(modal, confirm) { modal.success({ confirm }); modal.complete?.() }

async function settingsContainsOnlyRequestedEntries() {
  const { subject, calls } = mount('pages/settings/index.vue', ['settingGroups', 'accountActions', 'openSetting', 'openProfileEditor'])
  assert.deepEqual(Array.from(subject.settingGroups.flat(), item => item.label), ['修改密码', '注销账号', '用户协议', '隐私政策', '关于乐搭伴'])
  assert.deepEqual(Array.from(subject.settingGroups, group => group.length), [1, 1, 3], 'destructive action has its own card')
  const actions = []
  subject.accountActions.value = { open: action => actions.push(action), close() {} }
  subject.openSetting(subject.settingGroups[0][0])
  subject.openSetting(subject.settingGroups[1][0])
  assert.deepEqual(actions, ['password', 'close'])
  subject.openProfileEditor()
  assert.equal(calls.navigation[0].url, '/pages/profile/edit')
  subject.openSetting(subject.settingGroups[2][0])
  subject.openSetting(subject.settingGroups[2][1])
  assert.deepEqual(Array.from(calls.navigation.slice(1), item => item.url), ['/pages/legal/document?type=service', '/pages/legal/document?type=privacy'])
}
async function passwordChangeValidatesAndPreservesTheAuthenticatedAPI() {
  const requests = []
  const { subject: page, calls } = sheet({ changePassword: async (...args) => requests.push(args) })
  page.open('password')
  await tick()
  await page.submit()
  assert.equal(requests.length, 0)
  page.currentPassword.value = 'current-test-password'
  page.newPassword.value = 'new-test-password'
  page.confirmation.value = 'different-test-password'
  await page.submit()
  assert.equal(requests.length, 0)
  page.confirmation.value = page.newPassword.value
  await page.submit()
  assert.deepEqual(requests, [['current-test-password', 'new-test-password']])
  assert.equal(page.panel.value, '')
  assert.equal(page.currentPassword.value, '')
  assert.equal(page.newPassword.value, '')
  assert.equal(calls.toasts.at(-1).title, '密码修改成功')
}
async function initialPasswordUsesSMSInsteadOfTheChangePasswordAPI() {
  const requests = []
  const { subject: page, calls } = sheet({
    getAccountSecurity: async () => ({ data: security(false) }),
    sendInitialPasswordCode: async () => ({ data: { retry_after: 60, debug_code: '123456' } }),
    setInitialPassword: async (...args) => requests.push(args),
    changePassword: () => assert.fail('initial password must use SMS verification'),
  })
  page.open('password')
  await tick()
  await page.sendInitialCode()
  assert.equal(page.initialCode.value, '123456')
  assert.equal(page.codeSeconds.value, 60)
  page.newPassword.value = 'new-test-password'
  page.confirmation.value = 'new-test-password'
  page.initialCode.value = '12345'
  await page.submit()
  assert.equal(requests.length, 0)
  page.initialCode.value = '123456'
  await page.submit()
  assert.deepEqual(requests, [['123456', 'new-test-password']])
  assert.equal(calls.toasts.at(-1).title, '密码设置成功')
}
async function closureNeedsExplicitConfirmationAndCurrentPassword() {
  const requests = []
  const { subject: page, calls } = sheet({ closeAccount: async password => {
    requests.push(password)
    return { data: { closed: false, status: 'pending', working_days: 5, execute_after: '2026-10-12T14:20:00+08:00' } }
  }, logout: () => assert.fail('server has already revoked tokens; never refresh them for a logout') })
  page.open('close')
  assert.equal(page.panel.value, '')
  respond(calls.modals[0], false)
  assert.equal(page.panel.value, '')
  page.open('close')
  respond(calls.modals[1], true)
  await tick()
  await page.submit()
  assert.equal(requests.length, 0)
  page.currentPassword.value = 'current-test-password'
  await page.submit()
  assert.equal(requests.length, 0, 'valid password alone never authorizes closure')
  assert.equal(calls.toasts.at(-1).title, '请先阅读并同意账号注销协议')
  page.closureAgreed.value = true
  await page.submit()
  assert.deepEqual(requests, ['current-test-password'])
  assert.equal(page.panel.value, '')
  assert.equal(calls.modals.at(-1).title, '注销申请已提交')
  assert.ok(calls.modals.at(-1).content.includes('2026-10-12T14:20:00+08:00'))
  assert.ok(calls.modals.at(-1).content.includes('成功登录将撤销申请'))
  assert.equal(calls.navigation[0].clearSession, true)
  respond(calls.modals.at(-1), true)
  assert.equal(calls.navigation[1].url, '/pages/auth/login?closurePending=1')
}
async function closureWithoutPasswordRoutesToSMSSetup() {
  const { subject: page, calls } = sheet({ getAccountSecurity: async () => ({ data: security(false) }), closeAccount: () => assert.fail('must set password first') })
  page.open('close')
  respond(calls.modals[0], true)
  await tick()
  assert.equal(page.panel.value, '')
  assert.equal(calls.modals[1].title, '请先设置登录密码')
  respond(calls.modals[1], true)
  await tick()
  assert.equal(page.panel.value, 'password')
  assert.equal(page.security.value.password_set, false)
}
async function unknownClosureResponsesNeverClaimWaitingPeriodStarted() {
  for (const data of [undefined, { closed: true }, { closed: false, status: 'pending', working_days: 5, execute_after: 'invalid' }]) {
    const { subject: page, calls } = sheet({ closeAccount: async () => ({ data }) })
    page.open('close')
    respond(calls.modals[0], true)
    await tick()
    page.currentPassword.value = 'current-test-password'
    page.closureAgreed.value = true
    await page.submit()
    assert.equal(calls.modals.length, 1, 'no successful submission dialog for an unrecognized server response')
    assert.equal(calls.navigation.length, 0)
    assert.equal(calls.toasts.at(-1).icon, 'none')
  }
}
async function readingClosureNeverCarriesPasswordsOrImplicitConsent() {
  let securityChecks = 0
  const { subject: page, calls } = sheet({
    getAccountSecurity: async () => { securityChecks++; return { data: security(true) } },
    closeAccount: () => assert.fail('reading is never a closure request'),
  })
  page.open('close')
  respond(calls.modals[0], true)
  await tick()
  page.currentPassword.value = 'sensitive-test-password'
  page.closureAgreed.value = true
  page.readClosureAgreement()
  assert.equal(calls.navigation[0].url, '/pages/legal/document?type=closure')
  page.closePanel(true) // Settings onHide clears sensitive fields.
  assert.equal(page.currentPassword.value, '')
  assert.equal(page.closureAgreed.value, false)
  page.resume()
  await tick()
  assert.equal(page.panel.value, 'close')
  assert.equal(securityChecks, 2, 'account state is verified again after returning')
  assert.equal(page.currentPassword.value, '')
  assert.equal(page.closureAgreed.value, false)
  await page.submit()
  assert.equal(calls.toasts.at(-1).title, '请先阅读并同意账号注销协议')
  page.closePanel()
  page.resume()
  assert.equal(page.panel.value, '')
}
async function unknownStateAndFailedRequestsNeverClaimSuccess() {
  const { subject: page, calls } = sheet({ getAccountSecurity: async () => { throw new Error('测试状态加载失败') }, changePassword: () => assert.fail('unknown account state') })
  page.open('password')
  await tick()
  page.currentPassword.value = 'current-test-password'
  page.newPassword.value = page.confirmation.value = 'new-test-password'
  await page.submit()
  assert.equal(page.error.value, '测试状态加载失败')
  assert.equal(calls.toasts.length, 0)
  const failed = sheet({ changePassword: async () => { throw new Error('测试旧密码不正确') } })
  failed.subject.open('password')
  await tick()
  failed.subject.currentPassword.value = 'current-test-password'
  failed.subject.newPassword.value = failed.subject.confirmation.value = 'new-test-password'
  await failed.subject.submit()
  assert.equal(failed.subject.panel.value, 'password')
  assert.equal(failed.calls.toasts.at(-1).icon, 'none')
}
async function lateResponsesCannotRestoreClosedFormsOrStartSMSTimers() {
  let resolveSecurity
  const { subject: page } = sheet({ getAccountSecurity: () => new Promise(resolve => { resolveSecurity = resolve }) })
  page.open('password')
  page.closePanel()
  resolveSecurity({ data: security(true) })
  await tick()
  assert.equal(page.panel.value, '')
  assert.equal(page.security.value, null)
  let resolveSMS
  const initial = sheet({ getAccountSecurity: async () => ({ data: security(false) }), sendInitialPasswordCode: () => new Promise(resolve => { resolveSMS = resolve }) })
  initial.subject.open('password')
  await tick()
  const send = initial.subject.sendInitialCode()
  initial.subject.closePanel(true)
  resolveSMS({ data: { retry_after: 60, debug_code: '123456' } })
  await send
  assert.equal(initial.subject.initialCode.value, '')
  assert.equal(initial.calls.intervals.length, 0)
}
async function duplicateSubmitsAndUnmountedFormsStaySafe() {
  let finish, requests = 0
  const { subject: page, calls } = sheet({ changePassword: () => { requests++; return new Promise(resolve => { finish = resolve }) } })
  page.open('password')
  await tick()
  page.currentPassword.value = 'current-test-password'
  page.newPassword.value = page.confirmation.value = 'new-test-password'
  const pending = page.submit()
  await page.submit()
  assert.equal(requests, 1)
  finish()
  await pending
  page.currentPassword.value = 'sensitive-test-value'
  calls.hooks.unmount()
  assert.equal(page.currentPassword.value, '')
  page.open('password')
  assert.equal(page.panel.value, '')
}
async function oldSecurityAddressRedirectsToSettings() {
  const { calls } = mount('pages/security/index.vue', [])
  calls.hooks.load()
  assert.equal(calls.navigation[0].url, '/pages/settings/index')
}
async function main() {
  for (const test of [settingsContainsOnlyRequestedEntries, passwordChangeValidatesAndPreservesTheAuthenticatedAPI, initialPasswordUsesSMSInsteadOfTheChangePasswordAPI, closureNeedsExplicitConfirmationAndCurrentPassword, closureWithoutPasswordRoutesToSMSSetup, unknownClosureResponsesNeverClaimWaitingPeriodStarted, readingClosureNeverCarriesPasswordsOrImplicitConsent, unknownStateAndFailedRequestsNeverClaimSuccess, lateResponsesCannotRestoreClosedFormsOrStartSMSTimers, duplicateSubmitsAndUnmountedFormsStaySafe, oldSecurityAddressRedirectsToSettings]) {
    await test()
    console.log(`PASS ${test.name}`)
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
