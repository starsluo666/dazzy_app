// Build user H5 + admin first. All APIs are intercepted; no real coupons are issued.
// PLAYWRIGHT_MODULE and CHROME_EXECUTABLE can point to an existing local install.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const root = path.resolve(__dirname, '../..')
const screenshots = process.env.TEST_SCREENSHOT_DIR
function serve(folder, port) {
  const base = path.join(root, folder)
  const server = http.createServer((req, res) => {
    const target = path.resolve(base, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname))
    if (target !== base && !target.startsWith(base + path.sep)) return res.writeHead(403).end()
    const file = fs.existsSync(target) && fs.statSync(target).isFile() ? target : path.join(base, 'index.html')
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' }[path.extname(file)] || 'application/octet-stream'
    res.writeHead(200, { 'Content-Type': type }); fs.createReadStream(file).pipe(res)
  })
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)))
}
const appUrl = 'http://127.0.0.1:5217'
const adminUrl = 'http://127.0.0.1:5218'
const rules = { name: '周末搭伴券', face_amount: 3000, min_order_amount: 10000, valid_days: 7, description: '请在有效期内使用。' }
function campaign(id, name) {
  return { public_id: id, name, banner_url: `${appUrl}/static/activities/activity-channel-hero-v1.webp`, coupon: { ...rules },
    starts_at: '2026-01-01T00:00:00Z', ends_at: '2030-12-31T15:59:59Z', state: 'active', claimed: false, can_claim: true, user_coupon: null,
    banner_id: 'banner-image', template_public_id: 'coupon-template', stock: 100, issued_count: 0, remaining_count: 100, used_count: 0, status: 'published', sort_order: 0, revision: 2, published_at: '2026-01-01T00:00:00Z' }
}
async function shot(page, name) { if (screenshots) { fs.mkdirSync(screenshots, { recursive: true }); await page.waitForTimeout(450); await page.screenshot({ path: path.join(screenshots, name), fullPage: true }) } }
async function main() {
  const servers = [await serve('dazzy_app/dist/build/h5', 5217), await serve('dazzy_admin/dist', 5218)]
  let browser
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {}) })
    for (const width of [320, 390, 430]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: true, isMobile: true })
      const campaigns = [campaign('campaign-a', '周末搭伴好礼'), campaign('campaign-b', '同城见面礼')]
      let visibleCampaigns = campaigns
      let claimCount = 0
      const errors = []
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url())
        if (!url.pathname.includes('/api/v1/')) return url.hostname === '127.0.0.1' ? route.continue() : route.abort()
        let data = { items: [], counters: {}, unread: 0 }
        if (url.pathname.endsWith('/locations/cities/')) data = { items: [{ city_code: '130400', city_name: '邯郸市' }] }
        else if (url.pathname.endsWith('/home/')) data = { coupon_campaigns: visibleCampaigns, card_assets: {}, recommended_providers: [], recommended_activities: [], errors: {} }
        else if (url.pathname.includes('/coupon-campaigns/')) {
          const item = campaigns.find(c => url.pathname.includes(c.public_id))
          if (url.pathname.endsWith('/claim/')) {
            claimCount++
            await new Promise(resolve => setTimeout(resolve, 200))
            item.claimed = true; item.can_claim = false
            item.user_coupon = { public_id: `claimed-${item.public_id}`, template_name: rules.name, face_amount: rules.face_amount, min_order_amount: rules.min_order_amount, expires_at: '2030-12-31T00:00:00Z', status: 'available', source: 'campaign' }
          }
          data = item
        } else if (url.pathname.endsWith('/users/me/coupons/')) data = { items: campaigns.filter(c => c.user_coupon).map(c => c.user_coupon) }
        await route.fulfill({ json: { data } })
      })
      const page = await context.newPage()
      page.on('pageerror', e => errors.push(e.message))
      await page.goto(`${appUrl}/#/pages/index/index`)
      await page.locator('.campaign-cta').first().waitFor()
      assert.equal(await page.locator('.campaign-dot').count(), 2)
      assert.equal(await page.locator('.dz-sheet--visible').count(), 0, 'no automatic popup')
      assert.equal(await page.locator('.campaign-banner .campaign-coupon').count(), 0, 'no white coupon footer')
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
      await shot(page, `home-${width}.png`)
      // Actual native swiper touch gesture changes page and opens the correct campaign.
      const box = await page.locator('.campaign-swiper').boundingBox()
      const cdp = await context.newCDPSession(page)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width - 30, y: box.y + 60 }] })
      for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + box.width - 30 - i * (box.width - 60) / 6, y: box.y + 60 }] })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await page.waitForFunction(() => document.querySelectorAll('.campaign-dot')[1].classList.contains('campaign-dot--active'))
      await page.locator('.campaign-cta').nth(1).click()
      await page.locator('.campaign-title').filter({ hasText: '同城见面礼' }).waitFor()
      await shot(page, `sheet-${width}.png`)
      await page.locator('.campaign-submit').click()
      await page.waitForURL(/pages\/auth\/login/)
      assert.match(page.url(), /campaign-b/)
      assert.equal(claimCount, 0, 'login first; never issue without auth')
      await page.evaluate(() => localStorage.setItem('dazzy.accessToken', 'synthetic-local-only'))
      await page.goto(`${appUrl}/#/pages/index/index?coupon_campaign=campaign-b`)
      await page.reload() // Login uses reLaunch; discard the old unauthenticated page stack.
      await page.locator('.campaign-submit').filter({ hasText: '立即领取' }).waitFor()
      await page.locator('.campaign-submit').click()
      await page.locator('.campaign-success').waitFor()
      assert.equal(claimCount, 1)
      await page.locator('.dz-sheet__close').click()
      await page.locator('.campaign-cta').first().click()
      await page.locator('.campaign-title').filter({ hasText: '周末搭伴好礼' }).waitFor()
      assert.match(await page.locator('.campaign-submit').innerText(), /立即领取/)
      await page.locator('.campaign-submit').click()
      await page.locator('.campaign-success').waitFor()
      assert.equal(claimCount, 2, 'campaigns have independent claim state')
      await page.locator('.campaign-wallet').click()
      await page.waitForURL(/pages\/coupons\/index/)
      await page.locator('.coupon-card').nth(1).waitFor()
      visibleCampaigns = []
      campaigns[0].claimed = false; campaigns[0].can_claim = false; campaigns[0].state = 'exhausted'; campaigns[0].user_coupon = null
      await page.goto(`${appUrl}/#/pages/index/index?coupon_campaign=campaign-a`)
      await page.reload()
      await page.locator('.campaign-submit').filter({ hasText: '优惠券已领完' }).waitFor()
      assert.notEqual(await page.locator('.campaign-submit').getAttribute('disabled'), null)
      assert.equal(claimCount, 2, 'exhausted campaign cannot issue another coupon')
      await page.goto(`${appUrl}/#/pages/index/index`)
      await page.reload()
      await page.locator('.hero-title').waitFor()
      assert.equal(await page.locator('.campaign-cta').count(), 0)
      assert.deepEqual(errors, [])
      await context.close()
      console.log(`PASS ${width}px: native swipe, image-only banner, login return, two independent claims, wallet, fallback`)
    }

    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    let items = [campaign('campaign-admin', '周末搭伴好礼')]
    const changes = [], errors = [], assetKinds = []
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url())
      if (!url.pathname.includes('/api/v1/')) return url.hostname === '127.0.0.1' ? route.continue() : route.abort()
      let data = { items: [], pagination: { total: 0 }, counters: {}, unread: 0 }
      if (url.pathname.endsWith('/admin/auth/refresh/')) data = { access: 'synthetic-admin' }
      else if (url.pathname.endsWith('/admin/me/')) data = { user: { nickname: '测试运营', phone: '' }, organization: null, role_name: '测试', permissions: ['*'], data_scope: 'all', city_codes: [] }
      else if (url.pathname.endsWith('/admin/assets/')) { assetKinds.push(url.searchParams.get('kind')); data = { items: [{ id: 'banner-new', name: '活动海报.webp', kind: 'image', url: items[0].banner_url }], pagination: { total: 1 } } }
      else if (url.pathname.endsWith('/admin/coupon-campaigns/')) data = { items, templates: [{ ...rules, public_id: 'coupon-template' }], pagination: { total: items.length } }
      else if (url.pathname.endsWith('/claims/')) data = { items: [{ nickname: '测试用户', phone_masked: '139****2001', claimed_at: '2026-10-10T00:00:00Z', coupon: { status: 'available' } }], pagination: { total: 1 } }
      else if (url.pathname.includes('/admin/coupon-campaigns/')) {
        const payload = request.postDataJSON()
        if (request.method() === 'PATCH') { items[0] = { ...items[0], ...payload, revision: 3 }; changes.push('save') }
        else { items[0].status = payload.action === 'offline' ? 'offline' : 'published'; items[0].state = payload.action === 'offline' ? 'offline' : 'active'; items[0].revision++; changes.push(payload.action) }
        data = items[0]
      }
      await route.fulfill({ json: { data } })
    })
    const page = await context.newPage()
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(`${adminUrl}/#/coupon-campaigns`)
    await page.getByRole('heading', { name: '领券活动', exact: true }).waitFor()
    await page.getByRole('button', { name: '编辑 / 预览' }).click()
    await page.locator('.campaign-form input').first().fill('周末搭伴新好礼')
    await page.getByRole('button', { name: '更换图片', exact: true }).click()
    await page.locator('.picker-item').click()
    assert.deepEqual(assetKinds, ['image'])
    await shot(page, 'admin-editor.png')
    await page.getByRole('button', { name: '保存修改', exact: true }).click()
    await page.getByText('活动已保存', { exact: true }).waitFor()
    assert.equal(items[0].banner_id, 'banner-new')
    await page.getByRole('button', { name: '下架', exact: true }).click()
    await page.getByRole('button', { name: '确认', exact: true }).click()
    await page.getByText('活动状态已更新', { exact: true }).waitFor()
    await page.getByRole('button', { name: '领取记录', exact: true }).click()
    await page.getByText('139****2001', { exact: true }).waitFor()
    assert.deepEqual(changes, ['save', 'offline'])
    assert.deepEqual(errors, [])
    await context.close()
    console.log('PASS admin: edit, image asset selection, preview, save, confirmed offline, masked claim records')
  } finally {
    if (browser) await browser.close()
    for (const server of servers) await new Promise(resolve => server.close(resolve))
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
