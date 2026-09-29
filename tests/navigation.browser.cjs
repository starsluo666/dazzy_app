// Header regression: local H5 only. APIs are mocked and external requests are blocked.
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), http = require('node:http')
const { chromium } = require(process.env.DAZZY_PLAYWRIGHT_MODULE || 'playwright')
const root = path.resolve(__dirname, '../dist/build/h5')
const pages = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/pages.json'), 'utf8')).pages
const output = process.env.DAZZY_SCREENSHOT_DIR
const city = { city_code: '130400', city_name: '邯郸市' }
const provider = { public_id:'test', nickname:'小周', birth_date:null, avatar_url:null, verified:true, is_online:false, service_city_name:'邯郸市', bio:'一起探索同城好去处', rating:'4.90', service_count:12, order_count:12, distance_km:null, services:[], media:[], gender:'male', lifestyle_photo_url:null, credit_score:100, max_service_radius_km:30, is_favorited:false }
const activity = { id:1, title:'周末桌游新手友好局', category:'桌游', category_slug:'board-games', tags:[], cover_url:null, status:'recruiting', meeting_place_name:'城市桌游空间', meeting_address:'邯郸市', description:'周末一起玩桌游', participation_rules:'请准时集合', starts_at:'2026-10-02T10:00:00+08:00', ends_at:'2026-10-02T12:00:00+08:00', formation_deadline:'2026-10-01T10:00:00+08:00', min_participants:3, participant_count:4, capacity:8, distance_km:null, aa_principal_amount:6800, platform_service_fee_amount:680, payable_amount:7480, service_fee_rate:'0.1', organizer_name:'小周', organizer_avatar_url:null, organizer_rating:'4.90', is_joined:false, is_organizer:false, participation_status:null, locked_seat_count:0, remaining_capacity:4, refund_rule_snapshot:{}, refund_template_version:'v1', settlement:null }
let detailReady = false
const errors = [], results = [], requests = []
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const filename = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname))
  if (!filename.startsWith(root + path.sep) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) { res.writeHead(404); res.end(); return }
  const mime = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.webp':'image/webp', '.png':'image/png' }[path.extname(filename)] || 'application/octet-stream'
  res.writeHead(200, { 'Content-Type':mime }); fs.createReadStream(filename).pipe(res)
})
async function main() {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  const browser = await chromium.launch({ headless:true, ...(process.env.DAZZY_BROWSER_PATH ? { executablePath:process.env.DAZZY_BROWSER_PATH } : {}) })
  try {
    const context = await browser.newContext({ viewport:{ width:390,height:844 }, isMobile:true, hasTouch:true })
    await context.addInitScript(() => localStorage.setItem('dazzy.accessToken','header-test-token'))
    const page = await context.newPage()
    page.setDefaultTimeout(10000)
    page.on('pageerror', error => errors.push(`${page.url()}: ${error.message}`))
    await page.route('**/*', async route => {
      const url = new URL(route.request().url())
      if (url.origin !== origin) return route.abort()
      if (!url.pathname.startsWith('/api/v1/')) return route.continue()
      requests.push({ path:url.pathname, detailReady })
      let data, status = 200
      if (url.pathname.endsWith('/locations/cities/')) data = { items:[city] }
      else if (url.pathname.endsWith('/home/')) data = { recommended_providers:[], recommended_activities:[], card_assets:{}, errors:{} }
      else if (/\/(providers|activities|addresses|categories|tags)\/$/.test(url.pathname)) data = { items:[], pagination:{ page:1,page_size:20,total:0 } }
      else if (detailReady && url.pathname.endsWith('/providers/test/')) data = provider
      else if (detailReady && url.pathname.endsWith('/activities/1/')) data = activity
      else { status = 500; data = { detail:'模拟加载失败' } }
      await route.fulfill({ status, contentType:'application/json', body:JSON.stringify(status === 200 ? { data } : data) })
    })
    async function shot(name) { if (output) { fs.mkdirSync(output,{ recursive:true }); await page.screenshot({ path:path.join(output,name+'.png') }) } }
    let visit = 0
    // A changed query forces a fresh document; hash-only goto may restore cached pages.
    async function go(route) { await page.goto(origin+'/?navigationSmoke='+ ++visit +'#/'+route); await page.locator('.dz-navbar:visible').waitFor() }
    async function metrics(route) {
      const value = await page.locator('.dz-navbar:visible').evaluate(nav => {
        const row = nav.querySelector('.dz-navbar__row'), title = nav.querySelector('.dz-navbar__title'), back = nav.querySelector('.dz-navbar__back')
        const bounds = element => element ? (() => { const rect = element.getBoundingClientRect(); return { x:rect.x,y:rect.y,width:rect.width,height:rect.height } })() : null
        return { row:bounds(row), title:bounds(title), back:bounds(back), font:title ? getComputedStyle(title).fontSize : null, titleText:title?.textContent, overflow:document.documentElement.scrollWidth > innerWidth }
      })
      assert(value.row.height >= 44, route+' header height')
      if (value.title) assert(Math.abs(value.title.x+value.title.width/2-(value.row.x+value.row.width/2)) < 1, route+' centered title')
      if (value.back) { assert(value.back.width >= 44, route+' back width'); assert(value.back.height >= 44, route+' back height') }
      results.push({ route,...value })
      return value
    }
    for (const config of pages) {
      const route = config.path + (config.path.endsWith('providers/detail') ? '?id=test' : config.path.endsWith('activities/detail') ? '?id=1' : '')
      await go(route)
      await metrics(config.path)
    }
    assert.equal(new Set(results.filter(item => item.font).map(item => item.font)).size,1,'consistent title type size')
    assert.equal(new Set(results.map(item => item.row.y)).size,1,'consistent safe-area offset')
    assert.equal(new Set(results.map(item => item.row.height)).size,1,'consistent header height')
    for (const width of [320,390,1440]) {
      await page.setViewportSize({ width,height:844 })
      await go('pages/index/index')
      await page.locator('.city').filter({ hasText:'邯郸市' }).waitFor()
      const centerGap = await page.locator('.dz-navbar:visible').evaluate(nav => {
        const city = nav.querySelector('.city').getBoundingClientRect(), search = nav.querySelector('.search').getBoundingClientRect()
        return Math.abs(city.y+city.height/2-search.y-search.height/2)
      })
      assert(centerGap < 1,'city/search aligned at '+width)
      await metrics('home-'+width); await shot('home-'+width)
      await page.locator('.dz-navbar--toolbar .search').click()
      await page.locator('.search-bar .submit').waitFor()
      const textGap = await page.locator('.search-bar .submit').evaluate(button => {
        const outer = button.getBoundingClientRect(), inner = button.querySelector('uni-text').getBoundingClientRect()
        return { x:Math.abs(outer.x+outer.width/2-inner.x-inner.width/2), y:Math.abs(outer.y+outer.height/2-inner.y-inner.height/2) }
      })
      assert(textGap.x < 1 && textGap.y < 1,'search text centered at '+width)
      await metrics('search-'+width); await shot('search-'+width)
      for (const route of ['pages/security/index','pages/messages/index','pages/report/index']) { await go(route); await metrics(route+'-'+width) }
      await shot('report-'+width)
    }
    await page.setViewportSize({ width:390,height:844 })
    await go('pages/index/index'); await page.locator('.dz-navbar--toolbar .search').click()
    await page.locator('.location').click(); await page.locator('.city-search').waitFor()
    await page.locator('.dz-navbar__back:visible').click(); await page.locator('.search-bar').waitFor()
    await page.locator('.dz-navbar__back:visible').click(); await page.locator('.dz-navbar--toolbar .city:visible').waitFor()
    await go('pages/booking/success'); await page.locator('.dz-navbar__back:visible').click()
    await page.waitForURL(url => url.hash === '#/pages/orders/list')
    await go('pages/orders/list'); await page.locator('.dz-navbar__back:visible').click()
    await page.waitForURL(url => !url.hash.includes('/pages/orders/list'))
    assert(['/pages/profile/index', '/pages/index/index'].some(route => page.url().endsWith(route)), 'direct order entry returns to its fallback or uni-app entry page: ' + page.url())
    for (const route of ['pages/providers/detail?id=test','pages/activities/detail?id=1']) {
      await go(route); await page.locator('.network-state--error').filter({ hasText:'模拟加载失败' }).waitFor()
      await page.locator('.dz-navbar__back:visible').click()
      await page.waitForURL(url => !url.hash.includes('/detail'))
      const destination = route.includes('providers') ? '/pages/providers/list' : '/pages/activities/index'
      assert([destination, '/pages/index/index'].some(route => page.url().endsWith(route)), 'direct detail entry returns within the app: ' + page.url())
    }
    detailReady = true
    for (const route of ['pages/providers/detail?id=test','pages/activities/detail?id=1']) {
      await go(route)
      try { await page.locator('.dz-navbar--transparent').waitFor() }
      catch (error) {
        await shot('detail-failure')
        console.error({ route, url:page.url(), body:await page.locator('body').innerText(), requests:requests.slice(-12), errors })
        throw error
      }
      assert.equal(await page.locator('.dz-navbar-placeholder').count(),0,'detail cover has no duplicate spacer')
      assert.equal(await page.locator('.dz-navbar__right .dz-navbar-action').count(),2,'detail actions retained')
      await metrics(route); await shot(route.includes('providers') ? 'provider-detail-390' : 'activity-detail-390')
    }
    assert.deepEqual(errors,[],'no runtime errors during header checks')
    if (output) fs.writeFileSync(path.join(output,'header-metrics.json'),JSON.stringify(results,null,2))
    console.log('PASS: '+pages.length+' page headers, 320/390/1440 alignment, title typography, back targets, nested back stack, detail overlays and actions')
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)) }
}
main().catch(error => { console.error(error); server.close(); process.exitCode = 1 })
