const assert = require('node:assert/strict')
const { execute, read } = require('./serviceCities.fixture.cjs')
const vue = require('vue')
const time = execute(read('utils/businessTime.ts'))
const script = read('pages/publish/index.vue').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
const handan = { city_code: '130400', city_name: '邯郸市' }
const chengdu = { city_code: '510100', city_name: '成都市' }
const venue = city => ({ ...city, name: '测试集合地点', address: '测试地址', longitude: '114.5', latitude: '36.6' })
function mount() {
  let cities = [handan, chengdu], fail = false, created = 0
  const searches = [], messages = [], tagCities = []
  const source = { title: '测试活动', description: '介绍', participation_rules: '规则', tag_slugs: ['test'],
    city_code: '110100', city_name: '北京市', capacity: 6, min_participants: 2, aa_principal_amount: 5000,
    starts_at: time.toBusinessDateTime(time.businessDateKeyAfter(3), '14:00'),
    ends_at: time.toBusinessDateTime(time.businessDateKeyAfter(3), '17:00'),
    formation_deadline: time.toBusinessDateTime(time.businessDateKeyAfter(2), '20:00') }
  const imports = { vue, '@dcloudio/uni-app': { onLoad() {}, onUnload() {} }, '@/utils/businessTime': time,
    '@/utils/navigation': {}, '@/utils/formatters': { getErrorMessage: e => e.message },
    '@/services/discoveryContext': { getDiscoveryCities: async () => { if (fail) throw new Error('城市加载失败'); return cities },
      getDiscoveryContext: () => ({ cityCode: chengdu.city_code }) },
    '@/services/locations': { searchLocations: async (keyword, region) => { searches.push({ keyword, region }); return { data: { items: [venue(handan), venue(chengdu), venue({ city_code: '110100' })] } } } },
    '@/services/activities': { getActivityTags: async code => { tagCities.push(code); return { data: { items: [{ slug: 'test' }] } } },
      getActivityCopySource: async () => ({ data: source }), createActivityDraft: async () => { created++; return { data: { id: 1 } } } },
    '@/services/payments': { requireActivityPaymentCapability: async () => {} },
  }
  const api = execute(script + '\nexports.api = { refreshOpenCities, searchCity, openCities, keyword, searchAddress, locations, chooseLocation, pendingLocation, confirmLocation, location, loadTags, form, agreed, coverAssetId, canSubmit, submit, applyCopySource };', imports,
    { uni: { showToast: o => messages.push(o.title), navigateTo() {} } }).api
  return { ...api, searches, messages, tagCities, setCities: value => { cities = value }, fail: () => { fail = true }, created: () => created }
}
async function main() {
  const page = mount()
  await page.refreshOpenCities()
  assert.equal(page.searchCity.value.city_code, '510100', 'publishing uses the city selected on home')
  await page.loadTags()
  assert.equal(page.tagCities[0], '510100')
  page.keyword.value = '集合地点'
  await page.searchAddress()
  assert.equal(page.searches[0].region, '成都市')
  assert.equal(page.locations.value.length, 2, 'closed cities in map search must be excluded')
  page.chooseLocation(venue({ city_code: '110100' }))
  assert.equal(page.pendingLocation.value, null)
  page.chooseLocation(venue(chengdu))
  page.setCities([handan])
  await page.confirmLocation()
  assert.equal(page.location.value, null, 'closing before confirm cannot select old venue')
  page.chooseLocation(venue(handan))
  await page.confirmLocation()
  assert.equal(page.location.value.city_code, '130400')
  Object.assign(page.form, { title: '测试活动', description: '介绍', rules: '规则', tagSlugs: ['test'] })
  page.agreed.value = true
  page.coverAssetId.value = 'cover'
  assert.equal(page.canSubmit.value, true)
  page.setCities([chengdu])
  await page.submit()
  assert.equal(page.created(), 0, 'closing before submit cannot create a new draft')
  await page.applyCopySource(1)
  assert.equal(page.location.value, null, 'closed historic venue must be reselected when copying')
  await page.searchAddress()
  assert.equal(page.locations.value.length, 1)
  page.fail()
  await page.searchAddress()
  assert.equal(page.locations.value.length, 0)
  assert.equal(page.openCities.value.length, 0)
  assert.equal(page.searchCity.value, null)
  assert.equal(page.canSubmit.value, false)
  console.log('PASS activity cities: shared home city, filtered venues, closure at confirm/submit, copy and network failure')
}
main().catch(e => { console.error(e); process.exitCode = 1 })
