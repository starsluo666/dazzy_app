const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

function load(relativePath, imports, globals = {}) {
  const filename = path.resolve(__dirname, relativePath)
  const source = fs.readFileSync(filename, 'utf8')
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const context = { exports: {}, require: name => {
    if (!(name in imports)) throw new Error('Unexpected import: ' + name)
    return imports[name]
  }, setTimeout, clearTimeout, ...globals }
  vm.runInNewContext(js, context, { filename })
  return context.exports
}
const clone = value => JSON.parse(JSON.stringify(value))
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const cities = [
  { city_code: '130400', city_name: '邯郸市' },
  { city_code: '110100', city_name: '北京市' },
  { city_code: '510100', city_name: '成都市' },
]
function contextHarness(options = {}) {
  const storage = new Map([['dazzy.discoveryCities', cities]])
  const calls = []
  let now = 1_000_000
  let positionCalls = 0
  const uni = {
    getStorageSync: key => storage.get(key),
    setStorageSync: (key, value) => storage.set(key, value),
    getLocation: options.getLocation || (args => { positionCalls++; args.success({ longitude: 114.518000012345, latitude: 36.607000123456 }) }),
  }
  const context = load('../src/services/discoveryContext.ts', {
    './session': { isAuthenticated: () => Boolean(options.authenticated) },
    './locations': { getSavedAddresses: options.addressRequest || (() => Promise.resolve({ data: { items: options.addresses || [] } })) },
    './http': { request: async (url, params) => {
      calls.push({ url, params })
      if (options.request) return options.request(url, params)
      return { data: url.endsWith('cities/') ? { items: cities } : {
        ...cities[0], is_open: true, longitude: '114.5240000', latitude: '36.6070000',
      } }
    } },
  }, { uni, Date: { now: () => now } })
  return { ...context, storage, calls, tick: milliseconds => { now += milliseconds }, positionCalls: () => positionCalls }
}

test('guest city browsing sends no fake center coordinates or automatic GPS request', async () => {
  const h = contextHarness()
  const ctx = await h.resolveDiscoveryContext()
  assert.deepEqual(clone(h.discoveryQuery(ctx)), { city_code: '130400' })
  assert.equal(h.positionCalls(), 0)
})
test('legacy saved city-center coordinates are discarded', async () => {
  const h = contextHarness()
  h.storage.set('dazzy.discoveryCity', { cityCode: '110100', source: 'manual', longitude: '116.4', latitude: '39.9' })
  assert.deepEqual(clone(h.discoveryQuery(await h.resolveDiscoveryContext())), { city_code: '110100' })
})
test('new server-configured city can be selected without frontend constants', async () => {
  const h = contextHarness()
  h.selectDiscoveryCity(cities[2])
  assert.equal((await h.resolveDiscoveryContext()).cityCode, '510100')
})
test('removed city falls back to first configured city without stale coordinates', async () => {
  const h = contextHarness()
  h.storage.set('dazzy.discoveryCity', { cityCode: '999999', source: 'manual' })
  assert.equal((await h.resolveDiscoveryContext()).cityCode, '130400')
})
test('same-city default address provides explicit coordinates; another manual city wins', async () => {
  const h = contextHarness({ authenticated: true, addresses: [{ city_name: '邯郸市', longitude: 114.51, latitude: 36.61, is_default: true }] })
  const ctx = await h.resolveDiscoveryContext()
  assert.equal(ctx.source, 'address')
  assert.equal(ctx.longitude, '114.5100000')
  h.selectDiscoveryCity(cities[1])
  assert.equal((await h.resolveDiscoveryContext()).longitude, undefined)
})
test('late address response cannot override a new manual city', async () => {
  const addresses = deferred()
  const h = contextHarness({ authenticated: true, addressRequest: () => addresses.promise })
  const pending = h.resolveDiscoveryContext()
  await new Promise(resolve => setImmediate(resolve))
  h.selectDiscoveryCity(cities[1])
  addresses.resolve({ data: { items: [{ city_name: '邯郸市', longitude: 114.51, latitude: 36.61 }] } })
  assert.equal((await pending).cityCode, '110100')
})
test('explicit positioning posts rounded GPS coordinates and never persists precise location', async () => {
  const h = contextHarness()
  const ctx = await h.locateDiscoveryCity()
  assert.equal(ctx.source, 'location')
  assert.equal(h.positionCalls(), 1)
  assert.deepEqual(clone(h.calls[0].params.data), { longitude: '114.5180000', latitude: '36.6070001' })
  assert.equal(h.calls[0].params.method, 'POST')
  assert.equal(h.storage.get('dazzy.discoveryCity').longitude, undefined)
  h.tick(10 * 60 * 1000 + 1)
  assert.equal(h.getDiscoveryContext().longitude, undefined)
})
test('denied positioning preserves the selected city', async () => {
  const h = contextHarness({ getLocation: args => args.fail({}) })
  h.selectDiscoveryCity(cities[1])
  await assert.rejects(h.locateDiscoveryCity(), /定位权限/)
  assert.equal(h.getDiscoveryContext().cityCode, '110100')
})
test('unopened located city is not selected', async () => {
  const h = contextHarness({ request: () => ({ data: { city_code: '440100', city_name: '广州市', is_open: false } }) })
  await assert.rejects(h.locateDiscoveryCity(), /暂未开通/)
  assert.equal(h.getDiscoveryContext().cityCode, '130400')
})
test('leaving the picker cancels location before a network request or state change', async () => {
  const h = contextHarness()
  await assert.rejects(h.locateDiscoveryCity(() => false), /取消/)
  assert.equal(h.calls.length, 0)
})
test('a failed city lookup cannot silently search all cities', async () => {
  const h = contextHarness({ request: () => { throw new Error('network offline') } })
  await assert.rejects(h.resolveDiscoveryContext(), /network offline/)
})

function pagerHarness(fetchPage) {
  return load('../src/composables/useDiscoveryPager.ts', {
    vue: require('vue'), '@/utils/formatters': { getErrorMessage: error => error.message },
  }).useDiscoveryPager(fetchPage, item => item.id)
}
const pageData = (page, ids, total = 4, pageSize = 2) => ({ data: { items: ids.map(id => ({ id })), pagination: { page, page_size: pageSize, total } } })
test('pager appends pages and stops at the last page', async () => {
  const requests = []
  const pager = pagerHarness(async page => { requests.push(page); return pageData(page, page === 1 ? [1, 2] : [3, 4]) })
  await pager.load(); await pager.load(false); await pager.load(false)
  assert.deepEqual(clone(pager.items.value), [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }])
  assert.deepEqual(requests, [1, 2])
  assert.equal(pager.hasMore.value, false)
})
test('old city or search responses cannot overwrite the latest results', async () => {
  const first = deferred(), second = deferred()
  let count = 0
  const pager = pagerHarness(() => (++count === 1 ? first : second).promise)
  const old = pager.load(), current = pager.load()
  second.resolve(pageData(1, [7, 8])); await current
  first.resolve(pageData(1, [1, 2])); await old
  assert.deepEqual(clone(pager.items.value), [{ id: 7 }, { id: 8 }])
})
test('load-more failure preserves items and retries the same page', async () => {
  const requests = []; let fail = true
  const pager = pagerHarness(async page => {
    requests.push(page)
    if (page === 2 && fail) { fail = false; throw new Error('offline') }
    return pageData(page, page === 1 ? [1, 2] : [3, 4])
  })
  await pager.load(); await pager.load(false)
  assert.equal(pager.items.value.length, 2)
  assert.equal(pager.moreError.value, 'offline')
  await pager.load(false)
  assert.deepEqual(requests, [1, 2, 2])
  assert.equal(pager.items.value.length, 4)
})
test('duplicate load-more calls are ignored; in-flight next page is invalidated on reset', async () => {
  const pending = deferred(); let calls = 0
  const pager = pagerHarness(async page => { calls++; return page === 1 ? pageData(1, [1, 2]) : pending.promise })
  await pager.load()
  const next = pager.load(false)
  await pager.load(false)
  assert.equal(calls, 2)
  pager.invalidate()
  pending.resolve(pageData(2, [3, 4])); await next
  assert.equal(pager.items.value.length, 0)
})
test('duplicate records are deduplicated when data changes between pages', async () => {
  const pager = pagerHarness(async page => pageData(page, page === 1 ? [1, 2] : [2, 3]))
  await pager.load(); await pager.load(false)
  assert.deepEqual(clone(pager.items.value), [{ id: 1 }, { id: 2 }, { id: 3 }])
  assert.equal(pager.hasMore.value, false)
})
