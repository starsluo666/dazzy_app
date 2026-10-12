// Run after build:h5. All API requests are mocked; no live business data is changed.
// Optional: PLAYWRIGHT_MODULE, CHROME_EXECUTABLE, TEST_SCREENSHOT_DIR, TEST_BANNER_IMAGE.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = path.resolve(__dirname, '../dist/build/h5')

async function main() {
  for (const name of ['provider-companion-v2', 'group-activity-v2']) {
    const asset = fs.readFileSync(path.join(base, 'static/home', `${name}.webp`))
    assert.equal(asset.toString('ascii', 0, 4), 'RIFF')
    assert.equal(asset.toString('ascii', 8, 12), 'WEBP')
    assert.ok(asset.length < 60 * 1024, `${name} exceeds the homepage image budget`)
  }
  const server = http.createServer((req, res) => {
    const target = path.resolve(base, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname))
    if (target !== base && !target.startsWith(base + path.sep)) return res.writeHead(403).end()
    const file = fs.existsSync(target) && fs.statSync(target).isFile() ? target : path.join(base, 'index.html')
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' }[path.extname(file)] || 'application/octet-stream'
    res.writeHead(200, { 'Content-Type': type }); fs.createReadStream(file).pipe(res)
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  let browser
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {}) })
    for (const width of [320, 375, 390, 430]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      const campaign = id => ({ public_id: id, name: id === 'newcomer' ? '新人见面礼' : '秋日搭伴好礼',
        banner_url: process.env.TEST_BANNER_IMAGE ? `${origin}/test-banner.png` : `${origin}/static/activities/activity-channel-hero-v1.webp`,
        coupon: { name: '达人服务券', face_amount: 3000, min_order_amount: 10000, valid_days: 7, description: '领取后在有效期内使用。' },
        starts_at: '2026-01-01T00:00:00Z', ends_at: '2030-12-31T15:59:59Z', state: 'active', claimed: false, can_claim: true, user_coupon: null })
      let campaigns = [campaign('newcomer'), campaign('autumn')]
      await context.route('**/*', async route => {
        const url = new URL(route.request().url())
        if (url.pathname === '/test-banner.png' && process.env.TEST_BANNER_IMAGE) return route.fulfill({ contentType: 'image/png', body: fs.readFileSync(process.env.TEST_BANNER_IMAGE) })
        if (!url.pathname.includes('/api/v1/')) return url.origin === origin ? route.continue() : route.abort()
        let data = { items: [], counters: {}, unread: 0, pagination: { total: 0 } }
        if (url.pathname.endsWith('/locations/cities/')) data = { items: [{ city_code: '130400', city_name: '邯郸市' }] }
        // Deliberately omit card_assets: the bundled illustrations work without remote art URLs.
        else if (url.pathname.endsWith('/home/')) data = { coupon_campaigns: campaigns, recommended_providers: [], recommended_activities: [], errors: {} }
        else if (url.pathname.includes('/coupon-campaigns/')) data = campaigns.find(c => url.pathname.includes(c.public_id))
        else if (url.pathname.endsWith('/service-categories/')) data = { items: ['桌球', '电竞', '桌游', '密室'].map((name, i) => ({ name, slug: `category-${i}`, icon_url: `${origin}/static/home/categories/${['billiards', 'esports', 'board-games', 'escape-room'][i]}.svg` })) }
        await route.fulfill({ json: { data } })
      })
      async function home() {
        await page.goto(`${origin}/#/pages/index/index`)
        await page.reload()
        await page.locator('.scene-art img').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode())))
        await page.locator('.loading-block').waitFor({ state: 'hidden' })
      }
      await home()
      assert.equal(await page.locator('.location-note').count(), 0, 'removed home location hint leaves no row')
      assert.equal(await page.locator('.city').isVisible(), true, 'top city picker remains available')
      const banner = await page.locator('.campaign-swiper').boundingBox()
      assert.ok(Math.abs(banner.height - (402 * width / 750 - 20)) < 1, `${width}: carousel is exactly 20 CSS px shorter`)
      assert.equal(await page.locator('.campaign-dot').count(), 2)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
      for (const scene of await page.locator('.scene').all()) {
        assert.equal(await scene.getAttribute('role'), 'button')
        const box = await scene.boundingBox()
        assert.ok(Math.abs(box.height - 210 * width / 750) < 1, 'entry card height is unchanged')
        const art = await scene.locator('.scene-art').boundingBox()
        assert.ok(art.x >= box.x && art.x + art.width <= box.x + box.width, 'complete illustration stays inside card')
        for (const selector of ['.scene-title', '.scene-copy', '.scene-action']) {
          const text = await scene.locator(selector).boundingBox()
          assert.ok(text.x >= box.x && text.x + text.width <= box.x + box.width, `${selector} stays inside card`)
          assert.ok(text.y >= box.y && text.y + text.height <= box.y + box.height, `${selector} is not clipped`)
          assert.ok(text.x + text.width <= art.x + 1, `${selector} does not overlap illustration`)
        }
        assert.equal(await scene.locator('img').evaluate(img => img.complete && img.naturalWidth === 384), true)
      }
      const cta = await page.locator('.campaign-cta').first().boundingBox()
      assert.ok(cta.height >= 44 && cta.y >= banner.y && cta.y + cta.height <= banner.y + banner.height, 'claim remains completely inside banner with 44px hit area')
      if (process.env.TEST_SCREENSHOT_DIR) {
        fs.mkdirSync(process.env.TEST_SCREENSHOT_DIR, { recursive: true })
        await page.screenshot({ path: path.join(process.env.TEST_SCREENSHOT_DIR, `home-${width}.png`), fullPage: true })
      }
      const cdp = await context.newCDPSession(page)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: banner.x + banner.width - 30, y: banner.y + 50 }] })
      for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: banner.x + banner.width - 30 - i * (banner.width - 60) / 8, y: banner.y + 50 }] })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await page.waitForFunction(() => document.querySelectorAll('.campaign-dot')[1].classList.contains('campaign-dot--active'))
      await page.locator('.campaign-cta').nth(1).click()
      await page.locator('.campaign-title').filter({ hasText: '秋日搭伴好礼' }).waitFor()
      const detail = await page.locator('.campaign-sheet-image').boundingBox()
      assert.ok(Math.abs(detail.height - 246 * width / 750) < 1, 'detail image is not shortened')
      await page.locator('.dz-sheet__close').click()
      await page.locator('.scene.provider .scene-art').click({ force: true })
      await page.waitForURL(/pages\/providers\/list/)
      await home()
      await page.locator('.scene.activity .scene-action').click()
      await page.waitForURL(/pages\/activities\/list/)
      campaigns = []
      await home()
      await page.locator('.hero-title').waitFor()
      assert.equal(await page.locator('.scene-art').count(), 2, 'art remains visible without campaigns')
      assert.equal(await page.locator('.campaign-swiper').count(), 0)
      assert.deepEqual(errors, [])
      await context.close()
      console.log(`PASS ${width}px: artwork, text clearance, card links, carousel -20px, CTA, swipe, detail and fallback`)
    }
  } finally {
    if (browser) await browser.close()
    await new Promise(resolve => server.close(resolve))
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
