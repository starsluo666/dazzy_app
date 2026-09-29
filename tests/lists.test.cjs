const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const vue = require('vue')

function execute(relative, names, imports = {}, globals = {}) {
  const file = path.resolve(__dirname, '../src', relative)
  const source = fs.readFileSync(file, 'utf8')
  const script = file.endsWith('.vue') ? source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1] : source
  const code = ts.transpileModule(script + `\nglobalThis.subject = { ${names.join(',')} };`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const context = {
    exports: {},
    require(name) {
      if (Object.hasOwn(imports, name)) return imports[name]
      if (name === 'vue') return vue
      if (name === '@dcloudio/uni-app') return { onShow() {}, onLoad() {} }
      if (name === '@/services/session') return { isAuthenticated: () => true, guardCurrentPage: () => true }
      if (name === '@/utils/formatters') return { formatAmount: amount => Number(amount).toFixed(2), getErrorMessage: (_reason, fallback) => fallback }
      return {}
    },
    uni: { showToast() {}, navigateTo() {}, reLaunch() {}, showModal() {} },
    ...globals,
  }
  vm.runInNewContext(code, context, { filename: file })
  return context.subject
}

test('订单保留六个单行筛选，合法筛选仍映射原状态', () => {
  const presentation = execute('services/orderPresentation.ts', ['orderTabs', 'inOrderBucket', 'orderStatusCopy'])
  const page = execute('pages/orders/list.vue', ['filterOptions', 'selectOrderTab', 'orders', 'visibleOrders', 'emptyTitle', 'activeTab'], {
    '@/services/orderPresentation': presentation,
  })
  assert.deepEqual(Array.from(page.filterOptions, option => option.label), ['全部', '待付款', '待服务', '进行中', '待评价', '退款/售后'])
  page.orders.value = ['pending_payment', 'pending_service', 'in_service', 'pending_review', 'refunded'].map(status => ({ status }))
  page.selectOrderTab('after_sales')
  assert.equal(page.visibleOrders.value.length, 1)
  assert.equal(page.visibleOrders.value[0].status, 'refunded')
  assert.equal(page.emptyTitle.value, '暂无退款/售后订单')
  page.selectOrderTab('invalid')
  assert.equal(page.activeTab.value, 'after_sales')
})

test('优惠券计数与历史状态不变，零张也保留计数', () => {
  const page = execute('pages/coupons/index.vue', ['coupons', 'filterOptions', 'visibleCoupons', 'switchTab', 'activeTab'])
  assert.deepEqual(Array.from(page.filterOptions.value, option => option.count), [0, 0])
  page.coupons.value = ['available', 'reserved', 'used', 'expired', 'revoked'].map(status => ({ status }))
  assert.deepEqual(Array.from(page.filterOptions.value, option => option.count), [1, 4])
  assert.equal(page.visibleCoupons.value.length, 1)
  page.switchTab('history')
  assert.deepEqual(Array.from(page.visibleCoupons.value, coupon => coupon.status), ['reserved', 'used', 'expired', 'revoked'])
  page.switchTab('invalid')
  assert.equal(page.activeTab.value, 'history')
})

test('活动切换角色重置状态，参数与原接口一致', async () => {
  const calls = []
  const page = execute('pages/activities/mine.vue', ['setRole', 'setState', 'role', 'state', 'emptyTitle'], {
    '@/services/activities': { getMyActivities: async options => { calls.push({ ...options }); return { data: { items: [] } } } },
  })
  page.setState('upcoming')
  await Promise.resolve()
  assert.equal(page.emptyTitle.value, '暂无进行中的活动')
  page.setRole('organized')
  await Promise.resolve()
  assert.equal(page.state.value, 'all')
  assert.equal(page.emptyTitle.value, '还没有发起过活动')
  assert.deepEqual(calls, [{ role: 'joined', state: 'upcoming' }, { role: 'organized', state: 'all' }])
  page.setRole('organized')
  page.setRole('invalid')
  page.setState('invalid')
  assert.equal(calls.length, 2)
})

test('浏览记录合法类型正常请求，非法类型不触发请求', async () => {
  const calls = []
  const page = execute('pages/history/index.vue', ['changeType', 'type'], {
    '@/services/engagements': { getBrowsingHistory: async type => { calls.push(type); return { data: { items: [] } } } },
  })
  page.changeType('provider')
  await Promise.resolve()
  page.changeType('activity')
  await Promise.resolve()
  page.changeType('invalid')
  assert.deepEqual(calls, ['provider', 'activity'])
  assert.equal(page.type.value, 'activity')
})

test('筛选挂载后才滚动到选中项，首次进入售后及后续切换均可定位', async () => {
  const props = vue.reactive({ value: 'after_sales', options: [{ value: 'all' }, { value: 'after_sales' }] })
  const mounted = []
  const page = execute('components/DzListFilters.vue', ['activeId', 'selectedId'], {
    vue: { ...vue, getCurrentInstance: () => ({ uid: 9 }), onMounted: callback => mounted.push(callback) },
  }, {
    defineProps: () => props,
    withDefaults: value => value,
    defineEmits() {},
  })
  assert.equal(page.activeId.value, '')
  mounted[0]()
  await vue.nextTick()
  assert.equal(page.activeId.value, 'dz-list-filter-9-1')
  props.value = 'all'
  await vue.nextTick()
  await vue.nextTick()
  assert.equal(page.activeId.value, 'dz-list-filter-9-0')
})
