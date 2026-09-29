<template>
  <view class="dz-page legal-page">
    <DzNavBar :title="document?.navTitle || '协议详情'" :back-action="goBack" />
    <main v-if="document" class="legal-content dz-container">
      <article class="reading-card">
        <header class="document-header">
          <h1>{{ document.title }}</h1>
          <text v-if="document.effectiveLabel" class="effective-date">{{ document.effectiveLabel }}</text>
        </header>
        <view class="document-contents">
          <button class="contents-toggle" :aria-expanded="contentsExpanded" aria-controls="legal-contents" @tap="contentsExpanded = !contentsExpanded" @keydown.enter.prevent="contentsExpanded = !contentsExpanded" @keydown.space.prevent="contentsExpanded = !contentsExpanded">
            <text>协议目录 · {{ headings.length }} 个章节</text><text aria-hidden="true">{{ contentsExpanded ? '收起 −' : '展开 +' }}</text>
          </button>
          <view v-if="contentsExpanded" id="legal-contents" class="contents-list">
            <button v-for="heading in headings" :key="heading.id" class="contents-link" @tap="scrollToHeading(heading.id)" @keydown.enter.prevent="scrollToHeading(heading.id)" @keydown.space.prevent="scrollToHeading(heading.id)">{{ heading.text }}</button>
          </view>
        </view>
        <view class="document-body">
          <template v-for="block in document.blocks" :key="block.id">
            <h2 v-if="block.kind === 'heading'" :id="block.id">{{ block.text }}</h2>
            <p v-else-if="block.kind === 'paragraph'" :id="block.id" :class="{ 'important-note': block.runs[0]?.text.startsWith('【特别说明】') }"><text v-for="(run, index) in block.runs" :key="index" :class="{ 'clause-bold': run.bold, 'clause-underline': run.underline }" selectable>{{ run.text }}</text></p>
            <view v-else :id="block.id" class="document-table">
              <view v-for="(row, rowIndex) in block.hasHeader ? block.rows.slice(1) : block.rows" :key="rowIndex" class="table-record">
                <view v-for="(cell, cellIndex) in row" :key="cellIndex" class="table-field">
                  <text v-if="block.hasHeader" class="table-label">{{ block.rows[0][cellIndex] }}</text>
                  <text class="table-value" selectable>{{ cell }}</text>
                </view>
              </view>
            </view>
          </template>
        </view>
      </article>
      <section class="related-documents" aria-label="其他协议">
        <text class="related-title">其他协议</text>
        <button v-for="link in relatedLinks" :key="link.kind" class="related-link" @tap="replaceDocument(link.kind)" @keydown.enter.prevent="replaceDocument(link.kind)" @keydown.space.prevent="replaceDocument(link.kind)"><text>{{ link.label }}</text><text aria-hidden="true">›</text></button>
      </section>
    </main>
    <view v-else class="missing-document dz-container"><NetworkState message="未找到该协议，请返回后重试" /><button class="missing-back" @tap="goBack">返回</button></view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onPageScroll } from '@dcloudio/uni-app'
import DzNavBar from '@/components/DzNavBar.vue'
import NetworkState from '@/components/NetworkState.vue'
import { getLegalDocument, legalLinks, legalDocumentUrl, type LegalDocumentKind, type LegalDocument, type LegalBlock } from '@/content/legal'
import { navigateBackOr } from '@/utils/navigation'

const document = ref<LegalDocument>()
const contentsExpanded = ref(false)
const scrollTop = ref(0)
const headings = computed(() => document.value?.blocks.filter((block): block is Extract<LegalBlock, { kind: 'heading' }> => block.kind === 'heading') || [])
const relatedLinks = computed(() => legalLinks.filter(link => link.kind !== document.value?.id))
onLoad(query => { document.value = getLegalDocument(query?.type) })
onPageScroll(event => { scrollTop.value = event.scrollTop })
function goBack() { navigateBackOr(() => uni.reLaunch({ url: '/pages/profile/index' })) }
function replaceDocument(kind: LegalDocumentKind) { uni.redirectTo({ url: legalDocumentUrl(kind) }) }
function scrollToHeading(id: string) {
  if (!headings.value.some(heading => heading.id === id)) return
  uni.createSelectorQuery().select('.legal-page .dz-navbar').boundingClientRect().select(`#${id}`).boundingClientRect().exec(result => {
    const navbar = result[0] as { height: number } | null
    const target = result[1] as { top: number } | null
    if (target) uni.pageScrollTo({ scrollTop: Math.max(0, scrollTop.value + target.top - (navbar?.height || 44) - 16), duration: 0 })
  })
}
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.legal-content { padding-top: $dz-space-3; padding-bottom: calc(#{$dz-space-5} + env(safe-area-inset-bottom)); }
.reading-card { padding: $dz-space-5 $dz-space-4; border-radius: $dz-radius-md; background: $dz-surface-card; }
.document-header { margin-bottom: $dz-space-4; }
h1 { margin: 0; color: $dz-text-primary; font-size: max(18px, #{$dz-fs-heading}); font-weight: $dz-fw-bold; line-height: 1.45; letter-spacing: -.01em; }
.effective-date { display: block; margin-top: $dz-space-2; color: $dz-text-secondary; font-size: max(12px, #{$dz-fs-caption}); line-height: 1.6; }
.document-contents { padding-bottom: $dz-space-4; border-bottom: 1rpx solid $dz-border-subtle; }
.contents-toggle, .contents-link, .related-link, .missing-back { display: flex; align-items: center; width: 100%; min-height: 44px; margin: 0; padding: $dz-space-2 0; border: 0; color: $dz-list-accent; background: transparent; font-size: max(14px, #{$dz-fs-body}); line-height: 1.6; text-align: left; white-space: normal; }
.contents-toggle { justify-content: space-between; gap: $dz-space-3; font-weight: $dz-fw-semibold; }
.contents-toggle > text:last-child { flex: none; font-size: max(12px, #{$dz-fs-caption}); font-weight: $dz-fw-regular; }
.contents-list { padding-top: $dz-space-2; }
.contents-link { border-bottom: 1rpx solid $dz-border-subtle; }
.contents-link:last-child { border: 0; }
.document-body { color: $dz-text-primary; font-size: max(14px, #{$dz-fs-body}); line-height: 1.85; overflow-wrap: anywhere; word-break: break-word; }
.document-body h2 { margin: $dz-space-5 0 $dz-space-3; font-size: max(16px, #{$dz-fs-body-strong}); font-weight: $dz-fw-bold; line-height: 1.6; }
.document-body p { margin: $dz-space-4 0; white-space: pre-wrap; }
.clause-bold { font-weight: $dz-fw-bold; }
.clause-underline { text-decoration: underline; text-underline-offset: .2em; }
.important-note { padding: $dz-space-3; border-radius: $dz-radius-sm; background: $dz-status-warning-soft; }
.document-table { margin: $dz-space-4 0; }
.table-record { padding: $dz-space-3; border: 1rpx solid $dz-border-subtle; border-radius: $dz-radius-sm; background: $dz-surface-subtle; }
.table-record + .table-record { margin-top: $dz-space-2; }
.table-field + .table-field { margin-top: $dz-space-2; }
.table-label, .table-value { display: block; white-space: pre-wrap; }
.table-label { color: $dz-text-secondary; font-size: max(12px, #{$dz-fs-caption}); line-height: 1.6; }
.related-documents { margin-top: $dz-space-4; padding: $dz-space-3 $dz-space-4; border-radius: $dz-radius-md; background: $dz-surface-card; }
.related-title { color: $dz-text-secondary; font-size: max(12px, #{$dz-fs-caption}); }
.related-link { justify-content: space-between; gap: $dz-space-3; }
.related-link + .related-link { border-top: 1rpx solid $dz-border-subtle; }
.missing-document { padding-top: $dz-space-6; }
.missing-back { justify-content: center; }
button::after { border: 0; }
button:focus-visible { outline: 2px solid $dz-list-accent; outline-offset: 2px; }
</style>
