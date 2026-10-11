const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm')
const ts = require('typescript')
const sourceRoot = path.resolve(__dirname, '../src')
function load(relative, dependencies = {}, globals = {}) {
  let source = fs.readFileSync(path.join(sourceRoot, relative), 'utf8')
  if (relative.endsWith('.vue')) source = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
  const js = ts.transpileModule(source.replaceAll('import.meta.env', '__env'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const context = { exports: {}, __env: { DEV: false }, ...globals, require: key => {
    assert.ok(key in dependencies, `Unexpected dependency: ${key}`)
    return dependencies[key]
  } }
  vm.runInNewContext(js, context)
  return context.exports
}
function vueFiles(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(folder, entry.name)
    return entry.isDirectory() ? vueFiles(file) : file.endsWith('.vue') ? [file] : []
  })
}
async function main() {
  const storage = new Map(), navigation = [], interceptors = {}
  const uni = {
    getStorageSync: key => storage.get(key), setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: key => storage.delete(key), reLaunch: args => navigation.push(args.url),
    navigateTo: args => { navigation.push(args.url); args.complete?.() },
    addInterceptor: (key, options) => { interceptors[key] = options },
  }
  const session = load('services/session.ts', {}, { uni, getCurrentPages: () => [], setTimeout: fn => fn() })
  assert.equal(session.isProtectedRoute('/pages/invitations/provider-register?code=ABCDEF123456'), false)
  assert.equal(session.isProtectedRoute('/pages/invitations/application'), true)
  assert.equal(session.isProtectedRoute('/pages/providers/apply'), true, 'normal application entry stays protected')
  session.installAuthenticationGuards()
  const args = { url: '/pages/invitations/application' }
  interceptors.navigateTo.invoke(args)
  assert.equal(args.url, '/pages/auth/login?redirect=%2Fpages%2Finvitations%2Fapplication')
  const pages = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'pages.json'), 'utf8')).pages
  assert.ok(pages.some(page => page.path === 'pages/invitations/provider-register'))
  assert.ok(pages.some(page => page.path === 'pages/invitations/application'))
  for (const file of vueFiles(sourceRoot)) {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /\/pages\/invitations\/provider-register/, `unexpected regular signup entry: ${file}`)
  }
  assert.doesNotMatch(fs.readFileSync(path.join(sourceRoot, 'pages/invitations/application.vue'), 'utf8'), /\/pages\/workbench\//)

  // A copied/scanned URL is anonymous. Missing or malformed codes never fetch an invitation.
  const ref = value => ({ value }), fetched = [], hooks = {}
  load('pages/invitations/provider-register.vue', {
    vue: { ref, shallowRef: ref, reactive: value => value, computed: fn => ({ get value() { return fn() } }) },
    '@dcloudio/uni-app': { onLoad: fn => { hooks.load = fn }, onShow: fn => { hooks.show = fn } },
    '@/components/LegalConsent.vue': {}, '@/content/legal': {},
    '@/composables/useSmsCode': { useSmsCode: () => ({ seconds: ref(0), sending: ref(false) }) },
    '@/services/providerInvites': { getProviderInvite: async code => { fetched.push(code); return { data: {} } } },
    '@/services/session': session, '@/services/auth': {},
  })
  for (const query of [{}, { code: 'NOTVALID' }, { code: 'ABCDEF123456/../' }]) hooks.load(query)
  assert.equal(fetched.length, 0)
  hooks.load({ code: 'abcdef123456' }); hooks.show()
  assert.deepEqual(fetched, ['ABCDEF123456'])
  assert.equal(navigation.length, 0, 'public invitation never redirects an anonymous user to login')

  const uploads = [], requests = []
  const http = load('services/http.ts', { './session': {
    getAccessToken: () => 'existing-account-token', getRefreshToken: () => 'existing-refresh',
    handleSessionExpired: () => assert.fail('public errors must not clear an existing session'),
  } }, { __env: { DEV: true, VITE_DEMO_USER_PUBLIC_ID: 'demo' }, uni: {
    uploadFile: args => { uploads.push(args); args.success({ statusCode: 401, data: '{"detail":"短信校验失败"}' }) },
    request: args => { requests.push(args); args.success({ statusCode: 200, data: {} }) },
  } })
  await http.request('/growth/provider-invites/ABCDEF123456/', { skipAuth: true })
  assert.equal(requests[0].header.Authorization, undefined)
  assert.equal(requests[0].header['X-Dazzy-Demo-User'], undefined)
  await assert.rejects(http.uploadFile('/growth/provider-invites/register/', '/test.jpg', 'file', {}, 90000, { source_code: 'ABCDEF123456' }, { skipAuth: true }), /短信校验失败/)
  assert.equal(uploads.length, 1)
  assert.equal(uploads[0].header.Authorization, undefined)
  assert.equal(uploads[0].header['X-Dazzy-Demo-User'], undefined)
  assert.equal(uploads[0].timeout, 90000)
  assert.equal(uploads[0].formData.source_code, 'ABCDEF123456')
  assert.equal(requests.length, 1, 'public 401 must not trigger token refresh or re-upload')

  const registration = load('services/providerInvites.ts', {
    './http': { uploadFile: async () => ({ data: { access: 'registered', refresh: 'registered-refresh', user: {} } }) },
    './session': session,
  })
  await registration.registerInvitedProvider('/test.jpg', {}, {})
  assert.equal(storage.get('dazzy.accessToken'), 'registered')
  assert.equal(storage.has('dazzy.provider.accessToken'), false, 'do not pretend the user is logged into a different app')
  console.log('PASS customer invitation: hidden entry, code gate, protected progress, anonymous multipart and customer session')
}
main().catch(e => { console.error(e); process.exitCode = 1 })
