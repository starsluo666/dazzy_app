const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')
const ts = require('typescript')

const source = fs.readFileSync(path.resolve(__dirname, '../src/services/providerCategories.ts'), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const context = { exports: {} }
vm.runInNewContext(compiled, context)
const { allProviderCategory, configuredProviderCategories } = context.exports
const plain = value => JSON.parse(JSON.stringify(value))

test('没有后台分类时只保留全部入口', () => {
  assert.equal(allProviderCategory.label, '全部')
  assert.equal(allProviderCategory.slug, '')
  assert.deepEqual(plain(configuredProviderCategories([])), [])
})

test('后台分类按返回顺序展示原名称，新增分类也能显示', () => {
  const categories = configuredProviderCategories([
    { id: 1, name: '桌球陪玩', slug: 'billiards' },
    { id: 2, name: '城市漫游', slug: 'city-walk' },
  ])
  assert.deepEqual(plain(categories.map(({ label, slug }) => ({ label, slug }))), [
    { label: '桌球陪玩', slug: 'billiards' },
    { label: '城市漫游', slug: 'city-walk' },
  ])
  assert.match(categories[0].icon, /billiards\.svg$/)
  assert.equal(categories[1].icon, '')
})

test('后台配置的图标优先于内置图标', () => {
  const [category] = configuredProviderCategories([
    { id: 1, name: '桌球', slug: 'billiards', icon_url: 'https://media.test/category.webp' },
  ])
  assert.equal(category.icon, 'https://media.test/category.webp')
})

test('无效或重复分类不会生成入口', () => {
  const categories = configuredProviderCategories([
    { id: 1, name: '桌球', slug: 'billiards' },
    { id: 2, name: '重复', slug: 'billiards' },
    { id: 3, name: ' ', slug: 'empty-name' },
    { id: 4, name: '无标识', slug: '' },
  ])
  assert.deepEqual(plain(categories.map(({ label, slug }) => ({ label, slug }))), [
    { label: '桌球', slug: 'billiards' },
  ])
})

test('公开分类请求按当前城市查询且不携带登录态', async () => {
  const discoverySource = fs.readFileSync(path.resolve(__dirname, '../src/services/discovery.ts'), 'utf8')
  const discoveryCode = ts.transpileModule(discoverySource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const calls = []
  const discovery = {
    exports: {},
    require: name => {
      assert.equal(name, './http')
      return { request: (url, options) => { calls.push({ url, options }); return Promise.resolve({ data: { items: [] } }) } }
    },
  }
  vm.runInNewContext(discoveryCode, discovery)

  await discovery.exports.getServiceCategories('130400')

  assert.deepEqual(plain(calls), [{
    url: '/service-categories/',
    options: { query: { city_code: '130400' }, skipAuth: true },
  }])
})
