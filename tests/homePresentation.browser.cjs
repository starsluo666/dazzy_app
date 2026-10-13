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
      // Every photo uses the same 5:4 crop in thumbnails, slides and preview.
      const photoSizes = [[1000, 800], [1000, 800], [1000, 800]]
      const providers = [...photoSizes, null].map((size, i) => ({
        public_id: i === 0 ? 'online' : i === 1 ? 'offline' : `photo-${i}`,
        nickname: ['竖图达人', '横图达人', '方图达人', '无图达人'][i],
        avatar_url: size ? `${origin}/test-provider-${i}.svg` : null,
        is_online: i !== 1, verified: true, birth_date: '2000-01-01', service_city_name: '邯郸市',
        bio: '测试封面展示', rating: '5.00', service_count: 12, order_count: 12, distance_km: null,
        availability_status: 'available', earliest_available_at: null, is_favorited: false,
        services: [{ id: 1, category: '桌球', category_slug: 'billiards', billing_type: 'hourly', price_amount: 8800 }],
      }))
      const campaign = id => ({ public_id: id, name: id === 'newcomer' ? '新人见面礼' : '秋日搭伴好礼',
        banner_url: process.env.TEST_BANNER_IMAGE ? `${origin}/test-banner.png` : `${origin}/static/activities/activity-channel-hero-v1.webp`,
        coupon: { name: '达人服务券', face_amount: 3000, min_order_amount: 10000, valid_days: 7, description: '领取后在有效期内使用。' },
        starts_at: '2026-01-01T00:00:00Z', ends_at: '2030-12-31T15:59:59Z', state: 'active', claimed: false, can_claim: true, user_coupon: null })
      let campaigns = [campaign('newcomer'), campaign('autumn')]
      await context.route('**/*', async route => {
        const url = new URL(route.request().url())
        const photo = url.pathname.match(/^\/test-provider-(\d)\.svg$/)
        if (photo) {
          const [w, h] = photoSizes[Number(photo[1])]
          return route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#e8ddd1"/><rect width="${w}" height="40" fill="#167a68"/><circle cx="${w / 2}" cy="${h * 0.16}" r="${Math.min(w, h) * 0.12}" fill="#9f7860"/><rect x="${w * 0.3}" y="${h * 0.35}" width="${w * 0.4}" height="${h * 0.6}" rx="24" fill="#879cad"/><rect y="${h - 40}" width="${w}" height="40" fill="#a85437"/></svg>` })
        }
        if (url.pathname === '/test-banner.png' && process.env.TEST_BANNER_IMAGE) return route.fulfill({ contentType: 'image/png', body: fs.readFileSync(process.env.TEST_BANNER_IMAGE) })
        if (!url.pathname.includes('/api/v1/')) return url.origin === origin ? route.continue() : route.abort()
        let data = { items: [], counters: {}, unread: 0, pagination: { total: 0 } }
        if (url.pathname.endsWith('/locations/cities/')) data = { items: [{ city_code: '130400', city_name: '邯郸市' }] }
        // Deliberately omit card_assets: the bundled illustrations work without remote art URLs.
        else if (url.pathname.endsWith('/home/')) data = { coupon_campaigns: campaigns, recommended_providers: providers, recommended_activities: [], errors: {} }
        else if (url.pathname.endsWith('/providers/')) data = { items: providers, pagination: { page: 1, page_size: 8, total: providers.length } }
        else if (/\/providers\/(offline|online)\/reviews\/$/.test(url.pathname)) data = { items: [], summary: { total: 0, rating: '0.00', distribution: {} } }
        else if (url.pathname.endsWith('/availability/')) data = { earliest: null }
        else if (/\/providers\/(offline|online)\/$/.test(url.pathname)) data = {
          public_id: url.pathname.includes('/offline/') ? 'offline' : 'online', nickname: '测试达人',
          is_online: url.pathname.includes('/online/'), verified: true,
          avatar_url: url.pathname.includes('/online/') ? providers[0].avatar_url : null,
          media: url.pathname.includes('/online/') ? providers.slice(0, 3).map((p, i) => ({ id: `gallery-${i}`, type: 'image', url: p.avatar_url })) : [],
          gender: 'female', birth_date: null, lifestyle_photo_url: url.pathname.includes('/online/') ? providers[0].avatar_url : null, service_city_name: '邯郸市',
          bio: '用于本地布局检查的模拟资料。', max_service_radius_km: 20, rating: '5.00', service_count: 0,
          is_favorited: false, services: [{ id: 1, category: '桌球', billing_type: 'hourly', price_amount: 8800 }],
        }
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
      async function assertFilledPhotos(selector, fallbackSelector) {
        const photos = page.locator(selector)
        await photos.nth(2).waitFor({ state: 'attached' })
        assert.equal(await photos.count(), 3)
        for (let i = 0; i < 3; i++) {
          const photo = photos.nth(i)
          await photo.locator('img').evaluate(img => img.decode())
          const layout = await photo.evaluate(el => {
            const picture = el.querySelector('img')
            const style = getComputedStyle(el.querySelector('div'))
            return { fit: style.backgroundSize, position: style.backgroundPosition,
              natural: [picture.naturalWidth, picture.naturalHeight], width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height,
              background: getComputedStyle(el.parentElement).backgroundColor }
          })
          assert.equal(layout.fit, 'cover', 'restored filled thumbnail presentation')
          assert.equal(layout.position, '50% 50%', 'cover remains centered')
          assert.deepEqual(layout.natural, photoSizes[i], 'original photo aspect ratio is preserved')
          assert.ok(Math.abs(layout.width / layout.height - 1.25) < .01, '5:4 image exactly fills 5:4 card without a second crop')
        }
        assert.equal(await page.locator(fallbackSelector).innerText(), '无', 'missing photo keeps nickname fallback')
      }
      await home()
      await assertFilledPhotos('.provider-image', '.provider-fallback')
      assert.equal(await page.locator('.location-note').count(), 0, 'removed home location hint leaves no row')
      assert.equal(await page.locator('.city').isVisible(), true, 'top city picker remains available')
      const banner = await page.locator('.campaign-swiper').boundingBox()
      assert.ok(Math.abs(banner.height - (402 * width / 750 - 20) * 0.8) < 1, `${width}: carousel is another 20% shorter`)
      const toolbar = await page.locator('.dz-navbar').boundingBox()
      const search = await page.locator('.search').boundingBox()
      assert.ok(Math.abs(banner.y - toolbar.y - toolbar.height - 24 * width / 750) < 1, 'homepage adds 24rpx spacing below toolbar')
      assert.ok(banner.y - search.y - search.height >= 24 * width / 750 - 1, 'banner stays separated from search field')
      assert.equal(await page.locator('.campaign-dot').count(), 2)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
      for (const scene of await page.locator('.scene').all()) {
        assert.equal(await scene.getAttribute('role'), 'button')
        const box = await scene.boundingBox()
        assert.ok(Math.abs(box.height - (210 * width / 750 - 20)) < 1, 'entry card is another 20 CSS px shorter')
        const art = await scene.locator('.scene-art').boundingBox()
        assert.ok(art.x >= box.x && art.x + art.width <= box.x + box.width, 'complete illustration stays inside card')
        assert.ok(art.y >= box.y && art.y + art.height <= box.y + box.height, 'illustration fits the shorter card vertically')
        const action = await scene.locator('.scene-action').boundingBox()
        assert.equal(await scene.locator('.scene-action').evaluate(el => el.tagName), 'UNI-VIEW', 'use a layout container, not nested mini-program text')
        for (const selector of ['.scene-action-label', '.scene-arrow']) {
          const label = await scene.locator(selector).boundingBox()
          assert.ok(Math.abs(label.y + label.height / 2 - action.y - action.height / 2) < 1, 'CTA text and arrow are vertically centered')
        }
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
      const ctaFace = await page.locator('.campaign-cta-face').first().boundingBox()
      assert.ok(Math.abs(ctaFace.height - 44 * 0.8) < 1, 'claim pill is visually 20% shorter while its hit area stays usable')
      assert.ok(Math.abs(ctaFace.y + ctaFace.height / 2 - cta.y - cta.height / 2) < 1, 'visible pill is centered inside hit area')
      for (const selector of ['.campaign-cta-label', '.campaign-arrow']) {
        const label = await page.locator(selector).first().boundingBox()
        assert.ok(Math.abs(label.y + label.height / 2 - ctaFace.y - ctaFace.height / 2) < 1, 'claim label and arrow remain vertically centered')
      }
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
      await assertFilledPhotos('.photo uni-image', '.photo-fallback')
      assert.equal(await page.locator('.book.disabled').innerText(), '不可预约', 'offline booking state is preserved')
      if (process.env.TEST_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.TEST_SCREENSHOT_DIR, `provider-list-${width}.png`), fullPage: true })
      await page.locator('.photo').first().click()
      await page.waitForURL(/pages\/providers\/detail\?id=online/)
      await home()
      await page.locator('.scene.activity .scene-action').click()
      await page.waitForURL(/pages\/activities\/list/)
      campaigns = []
      await home()
      await page.locator('.hero-title').waitFor()
      assert.equal(await page.locator('.scene-art').count(), 2, 'art remains visible without campaigns')
      assert.equal(await page.locator('.campaign-swiper').count(), 0)
      for (const state of ['offline', 'online']) {
        await page.goto(`${origin}/#/pages/providers/detail?id=${state}`)
        await page.reload()
        const primary = page.locator('.action-bar .primary')
        await primary.waitFor()
        assert.equal(await primary.innerText(), state === 'offline' ? '离线不可预约' : '立即预约')
        assert.equal(await primary.getAttribute('disabled') !== null, state === 'offline')
        const box = await primary.boundingBox()
        const label = await primary.locator('.primary-label').boundingBox()
        assert.ok(Math.abs(label.y + label.height / 2 - box.y - box.height / 2) < 1, `${state}: booking label is vertically centered`)
        assert.ok(Math.abs(label.x + label.width / 2 - box.x - box.width / 2) < 1, `${state}: booking label is horizontally centered`)
        if (state === 'offline') {
          await primary.click({ force: true })
          assert.match(page.url(), /providers\/detail/, 'offline button must not start booking')
          assert.equal(await page.locator('.hero-fallback').innerText(), '测', 'missing gallery keeps fallback')
        } else {
          const gallery = page.locator('.hero-gallery')
          const galleryBox = await gallery.boundingBox()
          assert.ok(Math.abs(galleryBox.width / galleryBox.height - 1.25) < .01, 'every detail slide has a 5:4 frame')
          for (let i = 0; i < 3; i++) {
            const photo = page.locator('.gallery-image').nth(i)
            await photo.locator('img').evaluate(img => img.decode())
            assert.deepEqual(await photo.evaluate(el => ({ fit: getComputedStyle(el.querySelector('div')).backgroundSize,
              natural: [el.querySelector('img').naturalWidth, el.querySelector('img').naturalHeight] })),
            { fit: 'cover', natural: photoSizes[i] }, 'every slide displays a 5:4 cropped photo')
          }
          await page.locator('.gallery-image').first().click()
          const preview = page.locator('#u-a-p > div')
          await preview.waitFor({ state: 'visible' })
          assert.equal(await page.locator('#u-a-p img').count(), 3, 'preview has the same cropped gallery')
          assert.ok((await page.locator('#u-a-p img').first().getAttribute('src')).includes('/test-provider-0.svg'), 'enlarged preview uses exactly the same cropped asset')
          await preview.click({ position: { x: width - 24, y: 20 } })
          await preview.waitFor({ state: 'hidden' })
          if (process.env.TEST_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.TEST_SCREENSHOT_DIR, `provider-detail-portrait-${width}.png`) })
          for (let i = 1; i < 3; i++) {
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: galleryBox.x + galleryBox.width - 30, y: galleryBox.y + galleryBox.height / 2 }] })
            for (let step = 1; step <= 8; step++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: galleryBox.x + galleryBox.width - 30 - step * (galleryBox.width - 60) / 8, y: galleryBox.y + galleryBox.height / 2 }] })
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
            await page.waitForFunction(n => document.querySelector('.photo-count').textContent === `${n}/3`, i + 1)
          }
        }
        if (process.env.TEST_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.TEST_SCREENSHOT_DIR, `provider-${state}-${width}.png`) })
      }
      if (width === 390) {
        for (const viewport of [{ width: 667, height: 375 }, { width: 1024, height: 768 }]) {
          await page.setViewportSize(viewport)
          const galleryBox = await page.locator('.hero-gallery').boundingBox()
          assert.ok(Math.abs(galleryBox.width / galleryBox.height - 1.25) < .01,
            `${viewport.width}x${viewport.height}: landscape and wide layouts keep the full 5:4 photo`)
        }
      }
      assert.deepEqual(errors, [])
      await context.close()
      console.log(`PASS ${width}px: compact banners retained, all photo frames 5:4, cropped gallery/preview, centered CTAs, carousel, booking states`)
    }
  } finally {
    if (browser) await browser.close()
    await new Promise(resolve => server.close(resolve))
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
