// Build H5 first. All API responses are local mocks; external network is blocked.
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), http = require('node:http')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const root = path.resolve(__dirname, '../dist/build/h5')
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : decodeURIComponent(pathname)))
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return }
  res.setHeader('Content-Type', { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml' }[path.extname(file)] || 'application/octet-stream')
  fs.createReadStream(file).pipe(res)
})
;(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  let browser
  try {
    const base = `http://127.0.0.1:${server.address().port}`
    browser = await chromium.launch({ headless: true, ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {}) })
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    await page.addInitScript(() => localStorage.setItem('dazzy.accessToken', 'offline-cancellation-token'))
    const errors = [], posts = []
    page.on('pageerror', e => errors.push(e.message))
    const policy = { version: 'cancellation-v1-offline', clauses: ['公交／地铁：20 分钟内扣 30 元，超过扣 80 元，不另加路费。', '费用不叠加，不超过实付金额。有争议请联系客服。'] }
    const address = { id: 1, name: '测试集合地点', address: '城市中心集合地点', contact_name: '测试用户', contact_gender: 'mr', contact_phone: '13800000000', city_name: '测试城市', is_default: true }
    let order = {
      order_no: 'CANCEL-OFFLINE', status: 'departed', status_label: '已出发', provider_name: '测试达人', provider_avatar_url: null, service_name: '桌球',
      provider_public_id: 'provider-offline', starts_at: '2026-10-09T12:00:00+08:00', ends_at: '2026-10-09T14:00:00+08:00', created_at: '2026-10-08T12:00:00+08:00',
      paid_at: '2026-10-08T12:00:00+08:00', accepted_at: '2026-10-08T12:00:00+08:00', departed_at: '2026-10-09T11:50:00+08:00',
      service_fee_amount: 15000, transport_fee_amount: 1800, discount_amount: 0, payable_amount: 16800,
      meeting_address: '城市中心集合地点', duration_minutes: 120, refund_orders: [], settlement: null, after_sales: null, review: null,
      cancellation: { policy, transport_mode_label: '公交', wait_state: '', wait_deadline_at: null, decision: {}, can_preview: true, finance_notice: '' },
    }
    const quote = { token: 'OFFLINE-SIGNED-QUOTE', rule: 'transit_early', label: '公交／地铁时限内取消', paid_amount: 16800, refund_amount: 13800,
      retained_amount: 3000, retained_travel_amount: 0, compensation_amount: 3000, retained_service_amount: 0,
      notice: '仅适用于用户个人原因取消。如有达人责任或服务争议，请选择联系客服，不要确认扣费。' }
    let reject = false
    await page.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url())
      if (!url.pathname.includes('/api/v1/')) return url.origin === base ? route.continue() : route.abort()
      let data = { items: [] }
      if (url.pathname.endsWith('/CANCEL-OFFLINE/cancellation/')) {
        if (req.method() === 'POST') {
          posts.push(req.postDataJSON())
          if (reject) return route.fulfill({ status: 400, json: { detail: '订单阶段或费用已变化，请重新预览并确认。' } })
          order = { ...order, status: 'cancelled', cancellation: { ...order.cancellation, can_preview: false, decision: quote } }
          data = order
        } else data = quote
      } else if (url.pathname.endsWith('/CANCEL-OFFLINE/')) data = order
      else if (url.pathname.endsWith('/addresses/')) data = { items: [address] }
      else if (url.pathname.endsWith('/provider-orders/preview/')) data = { ...order, cancellation_policy: policy, route_distance_km: '6.80', route_duration_minutes: 18 }
      await route.fulfill({ json: { data } })
    })
    await page.goto(`${base}/#/pages/orders/detail?orderNo=CANCEL-OFFLINE`)
    const trigger = page.getByText('个人原因取消 · 查看退款金额', { exact: true })
    await trigger.click()
    const sheet = page.locator('.cancellation-card .dz-sheet--visible')
    await sheet.getByText('¥138.00', { exact: true }).waitFor()
    assert.equal(posts.length, 0, 'Preview never cancels')
    await sheet.getByText('保留往返交通费', { exact: true }).waitFor()
    assert.equal(await sheet.locator('.cancellation-card__row').filter({ hasText: '保留往返交通费' }).innerText(), '保留往返交通费\n¥0.00')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    if (process.env.TEST_SCREENSHOT_DIR) {
      fs.mkdirSync(process.env.TEST_SCREENSHOT_DIR, { recursive: true })
      await page.screenshot({ path: path.join(process.env.TEST_SCREENSHOT_DIR, 'cancellation-preview.png') })
    }
    reject = true
    await sheet.getByText('确认个人原因取消并接受以上费用', { exact: true }).click()
    await sheet.waitFor({ state: 'hidden' })
    assert.equal(posts.length, 1)
    await trigger.click()
    await sheet.getByText('¥138.00', { exact: true }).waitFor()
    reject = false
    await sheet.getByText('确认个人原因取消并接受以上费用', { exact: true }).click()
    await trigger.waitFor({ state: 'hidden' })
    assert.equal(posts.length, 2)
    assert.deepEqual(posts[1], { token: quote.token, personal_reason_confirmed: true })
    await page.getByText('本单规则 ›', { exact: true }).click()
    await page.getByText(policy.clauses[0], { exact: true }).waitFor()
    await page.evaluate(() => localStorage.setItem('dazzy-provider-booking-draft-v1', JSON.stringify({ type: 'object', data: {
      providerPublicId: 'provider-offline', providerName: '测试达人', providerRating: '4.9', providerVerified: true,
      services: [], serviceId: 1, serviceName: '桌球', billingType: 'hourly', unitPrice: 7500, durationMinutes: 120,
      date: '2026-10-10', startTime: '12:00', timeConfirmed: true, addressId: 1, address: '城市中心集合地点', addressName: '测试集合地点',
      contactName: '测试用户', contactGender: 'mr', contactPhone: '13800000000', note: '',
    } })))
    await page.goto(`${base}/#/pages/booking/confirm`)
    await page.getByText('达人出行方式', { exact: true }).waitFor()
    const pay = page.locator('.order-footer uni-button')
    assert.equal(await pay.getAttribute('disabled'), 'true')
    await page.getByText('服务与取消规则 ›', { exact: true }).click()
    await page.getByText('我已阅读并同意', { exact: true }).click()
    assert.equal(await pay.getAttribute('disabled'), 'true', 'Transport mode is mandatory')
    await page.locator('.cancel-transport__option').filter({ hasText: '公交' }).click()
    assert.equal(await pay.getAttribute('disabled'), 'true', 'Transport change requires consent again')
    await page.getByText('服务与取消规则 ›', { exact: true }).click()
    await page.getByText('我已阅读并同意', { exact: true }).click()
    assert.notEqual(await pay.getAttribute('disabled'), 'true')
    if (process.env.TEST_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.TEST_SCREENSHOT_DIR, 'booking-cancellation.png'), fullPage: true, animations: 'disabled' })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    assert.deepEqual(errors, [])
    console.log('PASS: itemized preview, no extra travel, no early POST, stale quote discarded, explicit confirmation, saved rules, booking transport/consent gate, no runtime errors/overflow')
  } finally { if (browser) await browser.close(); server.close() }
})().catch(e => { console.error(e); process.exitCode = 1 })
