const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const vue = require('vue')

function execute(relative, names, imports = {}, uni = {}) {
  const file = path.resolve(__dirname, '../src', relative)
  const source = fs.readFileSync(file, 'utf8')
  const script = file.endsWith('.vue') ? source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1] : source
  const code = ts.transpileModule(script + `\nglobalThis.subject = { ${names.join(',')} };`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const context = {
    exports: {},
    Error,
    require(name) {
      if (Object.hasOwn(imports, name)) return imports[name]
      if (name === 'vue') return vue
      if (name === '@dcloudio/uni-app') return { onShow() {}, onLoad() {} }
      return {}
    },
    uni: { removeStorageSync() {}, setStorageSync() {}, showToast() {}, ...uni },
  }
  vm.runInNewContext(code, context, { filename: file })
  return context.subject
}

const formatters = execute('utils/formatters.ts', ['formatAmount', 'getErrorMessage'])
const rules = (overrides = {}) => ({
  is_enabled: false,
  unit_face_amount: 100000,
  max_quantity_per_order: 10,
  tiers: [
    { min_quantity: 1, discount_rate_bps: 10000 },
    { min_quantity: 2, discount_rate_bps: 9500 },
    { min_quantity: 5, discount_rate_bps: 9000 },
  ],
  ...overrides,
})
function recharge(uni = {}, service = {}) {
  const subject = execute('pages/wallet/recharge.vue', [
    'campaign', 'quantity', 'paying', 'quickQuantities', 'quickAmount', 'setQuantity',
    'creditedAmount', 'payableAmount', 'discountAmount', 'tierLabel', 'discountLabel',
    'pendingOrder', 'pendingOrderNo', 'pay', 'load', 'legacyPending',
  ], {
    '@/utils/formatters': formatters, '@/services/wallet': service,
    '@/services/wechatPay': { isWechatBrowser: () => true, handlePaymentRecovery: async () => false },
  }, uni)
  subject.campaign.value = rules()
  return subject
}

async function amountsFollowConfiguredFaceValue() {
  const page = recharge()
  assert.deepEqual(Array.from(page.quickQuantities.value), [1, 2, 3, 5, 10])
  assert.deepEqual(Array.from(page.quickQuantities.value, page.quickAmount), ['1000', '2000', '3000', '5000', '10000'])
  page.campaign.value = rules({ unit_face_amount: 50000, max_quantity_per_order: 3 })
  assert.deepEqual(Array.from(page.quickQuantities.value, page.quickAmount), ['500', '1000', '1500'])
  page.campaign.value = rules({ unit_face_amount: 9999, max_quantity_per_order: 1 })
  assert.deepEqual(Array.from(page.quickQuantities.value, page.quickAmount), ['99.99'])
}

async function amountSelectionPreservesQuantityAndTierPricing() {
  const page = recharge()
  page.setQuantity(2)
  assert.equal(page.quantity.value, 2)
  assert.equal(page.creditedAmount.value, 200000)
  assert.equal(page.payableAmount.value, 200000)
  assert.equal(page.discountAmount.value, 0)
  assert.equal(page.tierLabel(2), '消费9.50折')
  assert.equal(page.discountLabel.value, '9.50 折')
  page.setQuantity(5)
  assert.equal(page.creditedAmount.value, 500000)
  assert.equal(page.payableAmount.value, 500000)
  assert.equal(page.tierLabel(5), '消费9.0折')
}

async function pendingOrderKeepsItsSnapshotUntilSelectionChanges() {
  const removals = []
  const page = recharge({ removeStorageSync: key => removals.push(key) })
  page.quantity.value = 2
  page.pendingOrderNo.value = 'TEST-RECHARGE'
  page.pendingOrder.value = { credited_amount: 150000, payable_amount: 123456, discount_rate_bps: 8230 }
  assert.equal(page.legacyPending.value, true)
  page.setQuantity(2)
  assert.equal(page.creditedAmount.value, 150000)
  assert.equal(page.payableAmount.value, 123456)
  assert.equal(page.pendingOrderNo.value, 'TEST-RECHARGE')
  assert.equal(removals.length, 0)
  page.setQuantity(3)
  assert.equal(page.pendingOrder.value, null)
  assert.equal(page.pendingOrderNo.value, '')
  assert.deepEqual(removals, ['pendingRechargeOrderNo'])
  assert.equal(page.creditedAmount.value, 300000)
}

async function changedConsumptionRateRequiresConsentEvenWhenRechargePriceIsUnchanged() {
  const toasts = []
  const page = recharge({ showToast: value => toasts.push(value.title) }, {
    createRechargeOrder: async () => ({ data: {
      order_no: 'NEW-RATE', quantity: 2, credited_amount: 200000, payable_amount: 200000,
      discount_rate_bps: 9700, discount_usage: 'consumption',
    } }),
    getRechargePaymentAuthorization: () => assert.fail('changed rate must not proceed to payment'),
  })
  page.campaign.value.is_enabled = true
  page.setQuantity(2)
  await page.pay()
  assert.equal(page.payableAmount.value, 200000)
  assert.equal(page.discountLabel.value, '9.70 折')
  assert.equal(page.legacyPending.value, false)
  assert.match(toasts[0], /确认最新金额和消费折扣/)
}

async function bookingCreationCarriesServerQuoteConfirmation() {
  const requests = []
  const service = execute('services/orders.ts', ['createProviderOrder'], {
    './http': { request: (...args) => { requests.push(args); return Promise.resolve({ data: {} }) } },
    '@/utils/businessTime': { toBusinessDateTime: () => '2026-10-10T13:00:00+08:00' },
  })
  await service.createProviderOrder({ serviceId: 1, addressId: 2, durationMinutes: 120, pricingToken: 'signed-quote' })
  assert.equal(requests[0][1].data.pricing_token, 'signed-quote')
  assert.equal(Object.hasOwn(requests[0][1].data, 'payable_amount'), false)
  assert.equal(Object.hasOwn(requests[0][1].data, 'wallet_discount_rate_bps'), false)
}

async function disabledAndOutOfRangeControlsDoNotCreateOrChangeOrders() {
  let requests = 0
  const page = recharge({}, { createRechargeOrder: () => { requests++; assert.fail('disabled payment submitted') } })
  await page.pay()
  assert.equal(requests, 0)
  for (const count of [0, -1, 11]) page.setQuantity(count)
  assert.equal(page.quantity.value, 1)
  page.paying.value = true
  page.setQuantity(2)
  assert.equal(page.quantity.value, 1)
}

async function campaignSwitchIsLoadedWithoutBeingOverridden() {
  const page = recharge({}, { getRechargeCampaign: async () => ({ data: rules() }) })
  await page.load()
  assert.equal(page.campaign.value.is_enabled, false)
}

async function feedbackPickerReflectsSelectionAndReset() {
  const page = execute('pages/support/index.vue', ['form', 'feedbackOrders', 'feedbackOrderIndex', 'selectFeedbackOrder', 'openCreate'], {
    '@/services/orders': { getProviderOrders: async () => ({ data: { items: [] } }) },
  })
  page.feedbackOrders.value = [{ order_no: 'TEST-ORDER', service_name: '城市陪伴' }]
  assert.equal(page.feedbackOrderIndex.value, 0)
  page.selectFeedbackOrder({ detail: { value: '1' } })
  assert.equal(page.feedbackOrderIndex.value, 1)
  assert.equal(page.form.targetType, 'provider_order')
  assert.equal(page.form.targetId, 'TEST-ORDER')
  page.selectFeedbackOrder({ detail: { value: '0' } })
  assert.equal(page.feedbackOrderIndex.value, 0)
  assert.equal(page.form.targetType, 'general')
  assert.equal(page.form.targetId, '')
  page.selectFeedbackOrder({ detail: { value: '1' } })
  page.openCreate()
  assert.equal(page.feedbackOrderIndex.value, 0)
  assert.equal(page.form.targetType, 'general')
  assert.equal(page.form.caseType, 'complaint')
}

async function main() {
  for (const test of [
    amountsFollowConfiguredFaceValue,
    amountSelectionPreservesQuantityAndTierPricing,
    pendingOrderKeepsItsSnapshotUntilSelectionChanges,
    changedConsumptionRateRequiresConsentEvenWhenRechargePriceIsUnchanged,
    bookingCreationCarriesServerQuoteConfirmation,
    disabledAndOutOfRangeControlsDoNotCreateOrChangeOrders,
    campaignSwitchIsLoadedWithoutBeingOverridden,
    feedbackPickerReflectsSelectionAndReset,
  ]) {
    await test()
    console.log(`PASS ${test.name}`)
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
