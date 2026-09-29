// Run after build:h5. All API requests are mocked; no business server is contacted.
const assert = require('node:assert/strict')
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(process.env.DAZZY_PLAYWRIGHT_MODULE || 'playwright')
const root = path.resolve(__dirname, '../dist/build/h5')
const output = process.env.DAZZY_SCREENSHOT_DIR
const cities = [
  { city_code: '130400', city_name: '邯郸市' },
  { city_code: '110100', city_name: '北京市' },
  { city_code: '510100', city_name: '成都市' },
]
const providers = Array.from({ length: 23 }, (_, index) => ({
  public_id: `provider-${index}`, nickname: `小周${index + 1}`, birth_date: null,
  avatar_url: null, verified: true, is_online: true, service_city_name: '成都市',
  bio: '一起探索同城好去处', rating: '4.90', service_count: 12, order_count: 12,
  distance_km: null, services: [{ id: 1, category: '桌游', category_slug: 'board-games', billing_type: 'hourly', price_amount: 8800 }],
  availability_status: 'available', earliest_available_at: null, is_favorited: false,
}))
const activity = {
  id: 1, title: '周末桌游新手友好局', category: '桌游', category_slug: 'board-games',
  tags: [{ name: '桌游', slug: 'board-games' }], cover_url: null, status: 'recruiting',
  meeting_place_name: '城市桌游空间', starts_at: '2026-10-02T10:00:00+08:00',
  min_participants: 3, participant_count: 4, capacity: 8, distance_km: null, aa_principal_amount: 6800,
}
const requests = [], errors = []
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const filename = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname))
  if (!filename.startsWith(root + path.sep) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) {
    res.writeHead(404); res.end(); return
  }
  const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' }[path.extname(filename)] || 'application/octet-stream'
  res.writeHead(200, { 'Content-Type': mime }); fs.createReadStream(filename).pipe(res)
})

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  const browser = await chromium.launch({ headless: true, ...(process.env.DAZZY_BROWSER_PATH ? { executablePath: process.env.DAZZY_BROWSER_PATH } : {}) })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    geolocation: { longitude: 114.518, latitude: 36.607 }, permissions: ['geolocation'] })
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url())
    if (url.origin !== origin) return route.abort()
    if (!url.pathname.startsWith('/api/v1/')) return route.continue()
    requests.push({ path: url.pathname, query: Object.fromEntries(url.searchParams), body: req.postDataJSON() })
    let data = {}
    if (url.pathname.endsWith('/locations/cities/')) data = { items: cities }
    else if (url.pathname.endsWith('/locations/locate/')) data = { ...cities[0], is_open: true, longitude: '114.5240000', latitude: '36.6070000' }
    else if (url.pathname.endsWith('/home/')) data = { recommended_providers: [], recommended_activities: [], card_assets: {}, errors: {} }
    else if (url.pathname.endsWith('/providers/')) {
      const current = Number(url.searchParams.get('page') || 1)
      data = { items: providers.slice((current - 1) * 20, current * 20), pagination: { page: current, page_size: 20, total: 23 } }
    } else if (url.pathname.endsWith('/activities/')) data = { items: [activity], pagination: { page: 1, page_size: 20, total: 1 } }
    else if (url.pathname.includes('categories') || url.pathname.includes('tags')) data = { items: [] }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data }) })
  })
  async function screenshot(name) {
    if (output) { fs.mkdirSync(output, { recursive: true }); await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true }) }
  }
  try {
    await page.goto(origin)
    await page.locator('.topbar .city:visible').filter({ hasText: '邯郸市' }).waitFor()
    await page.locator('.topbar .city:visible').click()
    await page.locator('.city-search input').waitFor()
    await page.locator('.city-grid button,.city-grid uni-button').filter({ hasText: '成都市' }).waitFor()
    await screenshot('cities')
    await page.locator('.city-search input').fill('成都')
    await page.locator('.city-grid uni-button').filter({ hasText: '成都市' }).click()
    await page.locator('.topbar .city:visible').filter({ hasText: '成都市' }).waitFor()
    await page.locator('.topbar .search:visible').click()
    const input = page.locator('.search-bar input')
    await input.fill('小周'); await input.press('Enter')
    await page.locator('.provider-title').filter({ hasText: '小周20' }).waitFor()
    await screenshot('search-providers')
    await page.getByText('加载更多', { exact: true }).click()
    await page.locator('.provider-title').filter({ hasText: '小周23' }).waitFor()
    assert.equal(await page.locator('.results .provider').count(), 23)
    assert(requests.some(item => item.path.endsWith('/providers/') && item.query.page === '2' && item.query.keyword === '小周' && item.query.city_code === '510100'))
    await page.locator('.tabs uni-button').filter({ hasText: '活动' }).click()
    await page.getByText(activity.title, { exact: true }).waitFor()
    await screenshot('search-activities')
    assert(requests.some(item => item.path.endsWith('/activities/') && item.query.city_code === '510100' && item.query.ordering === 'recommended'))
    await page.locator('.location:visible').click()
    await page.locator('.locate:visible').click()
    await page.locator('.location:visible').filter({ hasText: '本次定位' }).waitFor()
    assert(requests.some(item => item.path.endsWith('/activities/') && item.query.longitude === '114.5240000'))
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    assert.deepEqual(errors, [])
    console.log('PASS: city search/selection, guest global search, 23-result pagination, activity tab, explicit positioning, no runtime errors or horizontal overflow')
  } catch (error) {
    await screenshot('failure')
    throw error
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)) }
}
main().catch(error => { console.error(error); server.close(); process.exitCode = 1 })
