const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

function load(relative, dependencies, globals = {}) {
  const source = fs.readFileSync(path.resolve(__dirname, relative), 'utf8').replaceAll('import.meta.env', '__env')
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const context = { exports: {}, __env: { VITE_API_BASE_URL: '/api/v1', DEV: false }, ...globals,
    require: name => { assert.ok(name in dependencies, `Unexpected import ${name}`); return dependencies[name] } }
  vm.runInNewContext(output, context)
  return context.exports
}

async function main() {
  const sent = []
  let failure = false
  const http = load('../src/services/http.ts', { './session': { getAccessToken: () => 'test-token' } }, {
    uni: { uploadFile: options => {
      sent.push(options)
      options.success({ statusCode: failure ? 400 : 201, data: JSON.stringify(failure
        ? { file: '图片转换后体积过大，请压缩后重试。' }
        : { data: { id: 'synthetic', url: 'https://media.test/converted.jpg' } }) })
    } },
  })
  const dependencies = { './http': http, './session': {}, '@/utils/businessTime': {} }
  const cases = [
    ['auth', 'uploadAvatar', '/media/avatars/'],
    ['activities', 'uploadActivityCover', '/media/activity-covers/'],
    ['providers', 'uploadProviderApplicationPhoto', '/media/provider-lifestyle-photos/'],
    ['orders', 'uploadReviewImage', '/media/review-images/'],
    ['orders', 'uploadProviderOrderAfterSalesEvidence', '/media/support-attachments/'],
    ['support', 'uploadSupportAttachment', '/media/support-attachments/'],
  ]
  for (const [service, method, endpoint] of cases) {
    const upload = load(`../src/services/${service}.ts`, dependencies)[method]
    for (const file of [{ type: 'image/heic', name: 'IMG.HEIC' }, { type: '', name: 'wx_temp' }, undefined]) {
      const result = await upload('/tmp/wx_temp', file)
      const request = sent.at(-1)
      assert.equal(request.url, `/api/v1${endpoint}`)
      assert.equal(request.file, file)
      assert.equal(request.filePath, '/tmp/wx_temp')
      assert.equal(request.header.Authorization, 'Bearer test-token')
      assert.equal(result.data.url, 'https://media.test/converted.jpg')
    }
    const nativeFile = { type: 'image/heif', name: 'IMG.HEIF' }
    await upload('blob:synthetic', { file: nativeFile, size: 100 })
    assert.equal(sent.at(-1).file, nativeFile, `${method} must unwrap H5 File objects`)
  }
  failure = true
  await assert.rejects(http.uploadFile('/media/avatars/', '/tmp/big.heic'), /转换后体积过大/)
  const cover = fs.readFileSync(path.resolve(__dirname, '../src/pages/publish/index.vue'), 'utf8')
  assert.match(cover, /uploadActivityCover\(path, selected\)/)
  assert.match(cover, /selected\.size > 10 \* 1024 \* 1024/)
  console.log('PASS all customer photo services: HEIC/HEIF, missing MIME/extension, H5 File wrapper, server preview/error')
}

main().catch(error => { console.error(error); process.exitCode = 1 })
